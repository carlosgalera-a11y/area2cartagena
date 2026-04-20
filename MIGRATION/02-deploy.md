# Despliegue · Fase 0-2

## 0. Requisitos previos (manual, una sola vez)

1. **Crear proyecto GCP** `docenciacartagenaeste` en
   <https://console.cloud.google.com>.
2. **Habilitar billing** y crear presupuesto de 150 €/mes con alertas
   al 25 €, 50 € y 100 € (ver Plan Maestro §5.1).
3. **APIs a habilitar** (Console → APIs & Services → Library):
   - Cloud Functions
   - Cloud Run (necesario para Functions v2)
   - Cloud Build
   - Firestore
   - Secret Manager
   - Firebase App Check (`firebaseappcheck.googleapis.com`)
   - reCAPTCHA Enterprise (`recaptchaenterprise.googleapis.com`)
   - Cloud Logging
4. **Firestore**: crear base en modo nativo, región `europe-west1`.
5. **App Check / reCAPTCHA Enterprise**: registrar el sitio web
   `area2cartagena.es` y `docenciacartagenaeste.web.app`. Anotar la
   site-key pública.

## 1. Secretos en Secret Manager

```bash
gcloud config set project docenciacartagenaeste

# Crear los secretos
echo -n "<DEEPSEEK_KEY>"  | gcloud secrets create DEEPSEEK_API_KEY  --replication-policy=automatic --data-file=-
echo -n "<GEMINI_KEY>"    | gcloud secrets create GEMINI_API_KEY    --replication-policy=automatic --data-file=-
echo -n "<NAS_TUNNEL_URL>"   | gcloud secrets create NAS_TUNNEL_URL   --replication-policy=automatic --data-file=-
echo -n "<NAS_TUNNEL_TOKEN>" | gcloud secrets create NAS_TUNNEL_TOKEN --replication-policy=automatic --data-file=-

# Conceder acceso al service account de Functions
PROJ=$(gcloud config get-value project)
SA="$PROJ@appspot.gserviceaccount.com"
for s in DEEPSEEK_API_KEY GEMINI_API_KEY NAS_TUNNEL_URL NAS_TUNNEL_TOKEN; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

> Si NAS no se va a usar todavía, crear el secreto vacío con un `-`
> placeholder; el provider `nas` se autoinhabilita si el URL viene vacío.

## 2. Compilar y desplegar

Desde la raíz del repo:

```bash
# Instalar Firebase CLI (una sola vez)
npm install -g firebase-tools
firebase login

# Vincular el proyecto
firebase use docenciacartagenaeste

# Instalar deps de la función
cd functions && npm install && cd ..

# Desplegar reglas + indices + función
firebase deploy --only firestore:rules,firestore:indexes,functions:askAi

# (Opcional) desplegar también hosting
firebase deploy --only hosting
```

## 3. Verificar

```bash
# Healthcheck público
curl https://docenciacartagenaeste.web.app/api/health
# → {"status":"ok","ts":"..."}

# Endpoint protegido (sin token → 401)
curl -X POST https://docenciacartagenaeste.web.app/api/ai/ask
# → {"error":"unauthenticated", ...}

# Con un idToken válido (obtenido desde el frontend logueado)
curl -X POST https://docenciacartagenaeste.web.app/api/ai/ask \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Resume hipertensión arterial en 3 frases"}'
# → {"answer":"...","provider":"deepseek","remaining":49, ...}
```

## 4. Activar App Check enforce (cuando todas las páginas envíen el token)

Editar `functions/src/middleware/auth.ts` y eliminar la rama "soft":

```diff
-  if (acToken) {
-    try { ... } catch { /* warn */ }
-  }
+  if (!acToken) {
+    res.status(401).json({ error: 'appcheck_required' }); return;
+  }
+  await appCheck.verifyToken(acToken);
+  appCheckVerified = true;
```

Y redeploy.

## 5. Emulador local (desarrollo)

```bash
cd functions && npm run build && cd ..
firebase emulators:start
# UI en http://localhost:4000
# Functions en http://localhost:5001/docenciacartagenaeste/europe-west1/askAi
```

Para que la función pueda leer secretos en local, exportar antes:

```bash
export DEEPSEEK_API_KEY="..."
export GEMINI_API_KEY="..."
export NAS_TUNNEL_URL=""
export NAS_TUNNEL_TOKEN=""
```
