# Runbook · Backend Cartagenaeste

## Diagnóstico rápido

```bash
# Estado del proxy
curl https://cartagenaeste-prod.web.app/api/health
# → {"status":"ok","ts":"..."}

# Logs en vivo
firebase functions:log --only api -n 50

# Métricas
gcloud functions logs read api --region=europe-west1 --limit 100 \
  --format='value(timestamp,severity,textPayload)'
```

## Síntomas y causas frecuentes

| Síntoma | Causa probable | Acción |
|---|---|---|
| `429 quota_exhausted` masivo | Cuota diaria por defecto demasiado baja | Subir `quotas.aiPerDay` en `/tenants/default/users/{uid}` |
| `503 all_providers_failed` | Caída simultánea de DeepSeek + Gemini, o secretos sin permisos | Verificar Secret Manager IAM; probar Gemini aislado |
| `401 unauthenticated` recurrente | ID token expirado o reloj del cliente desincronizado | `auth.currentUser.getIdToken(true)` para refrescar |
| `appcheck` warn en logs | App Check soft-mode descartando tokens | Verificar dominio en reCAPTCHA Enterprise |
| Coste disparado | Sin caché o cuota desactivada | Revisar logs por `ai.cache_hit` ratio; bajar `maxInstances` |
| `PERMISSION_DENIED` en Firestore | Regla mal editada o claim no propagada | `firebase emulators:start` + tests; `getIdToken(true)` |

## Refrescar custom claims tras cambiarlas

Cuando un superadmin asigna `tenantId` o `role` a un usuario, el cliente
debe refrescar el token:

```js
await firebase.auth().currentUser.getIdToken(true);
```

## Rollback

```bash
# Volver a la versión anterior de la función api
firebase functions:list
gcloud functions deploy api --source <prev-source-zip> --region europe-west1
# o redeploy desde un tag git anterior
git checkout <tag-anterior>
firebase deploy --only functions:api
```

## Apagar el proxy (emergencia)

Cambiar la cuota global a 0 sin redeploy:

```bash
# Para un usuario concreto
gcloud firestore documents update \
  "tenants/default/users/<UID>" \
  --update-mask=quotas.aiPerDay --set='{"quotas":{"aiPerDay":0}}'
```

O desactivar la función completa:

```bash
gcloud functions delete api --region europe-west1
# La rewrite responderá 404; la app puede capturarlo y mostrar mantenimiento.
```

## Backup manual de Firestore

```bash
gcloud firestore export gs://cartagenaeste-backup/$(date +%F) \
  --collection-ids=tenants,moderadores,documentos_aprobados
```

## Restaurar un export

```bash
gcloud firestore import gs://cartagenaeste-backup/<fecha>
```
