# Arquitectura — Backend-first (Fase 1-2)

## Diagrama

```
┌──────────────────────────────────────────────────────┐
│ Navegador (HTML actual de GitHub Pages o Hosting)    │
│  - lib/ai-proxy.js → AIProxy.ask({prompt})           │
│  - Firebase Auth (idToken) + App Check (opcional)    │
└──────────────┬───────────────────────────────────────┘
               │ HTTPS  Authorization: Bearer <idToken>
               ▼
┌──────────────────────────────────────────────────────┐
│ Firebase Hosting · cartagenaeste-prod.web.app        │
│  - Sirve los HTML estáticos                          │
│  - Rewrite /api/** → función `api` (europe-west1)    │
└──────────────┬───────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────┐
│ Cloud Function v2 `api` (europe-west1, Node 20)      │
│  - Express router (/api/health, /api/me, /api/ai/ask)│
│  - Middleware: verifyIdToken + verifyAppCheck (soft) │
│  - Cuota diaria por usuario (transacción Firestore)  │
│  - Caché por hash (TTL 7 días)                       │
│  - Cascada de proveedores                            │
└──────┬──────────────┬──────────────┬─────────────────┘
       │              │              │
       ▼              ▼              ▼
   DeepSeek V3     Gemini 2.5     NAS local
   (capa 1)        Flash-Lite     (Cloudflare
   *fuera UE*      (capa 2 · UE)   Tunnel)
       │              │              │
       └──────────────┴──────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Firestore     │
              │ /tenants/{t}/ │
              │   aiCache/    │
              │   aiRequests/ │
              │   auditLogs/  │
              │   users/      │
              └───────────────┘
```

## Decisiones clave

- **Función única `api`** que enruta `/api/**` con Express. Permite añadir
  endpoints sin redesplegar funciones por separado.
- **Region `europe-west1`** (Bélgica). Residencia UE; coste menor que
  `europe-southwest1`. Misma decisión que el Plan Maestro §3.2.
- **App Check soft-enforce**. La verificación se hace en el middleware,
  pero no bloquea la petición si no hay token — necesario para que el
  frontend HTML legacy en GitHub Pages siga funcionando hasta que
  cargue el SDK de App Check en cada página. Una vez todas las páginas
  envían el header se cambia a hard-enforce (línea ~64 en
  `functions/src/middleware/auth.ts`).
- **Tenant `default`** para usuarios sin claim. Permite que la app actual
  funcione sin onboarding multi-tenant desde el día 0. Cuando se asigne
  un tenant real al usuario (Fase 3), su tráfico migra automáticamente.
- **Reglas Firestore híbridas**. El bloque nuevo `/tenants/{t}/**` vive
  junto a las colecciones legacy (`mis_notebooks`, `informes_ia`,
  etc.) para no romper la app actual.
- **Redacción previa de PII** antes de enviar el prompt a un proveedor
  externo. Cubre DNI/NIE, NHC, teléfono, email, fecha de nacimiento,
  IBAN y CIPA (heurístico).
- **Auditoría inmutable** en `/tenants/{t}/auditLogs`. Solo se guarda
  el hash del prompt, nunca el texto.

## Flujo de una petición `/api/ai/ask`

1. Frontend llama `AIProxy.ask({ prompt, systemPrompt })`.
2. Wrapper añade `Authorization: Bearer <idToken>` y, si está disponible,
   `X-Firebase-AppCheck: <token>`.
3. Hosting hace rewrite a la función `api`.
4. Middleware `requireAuth` verifica el ID token con Firebase Admin.
   Calcula `tenantId` (claim o `default`) y `role` (claim, email
   superadmin legacy, o `user`).
5. Handler `askAi`:
   - Valida prompt (≤8000 chars).
   - Decrementa cuota diaria del usuario en transacción
     (`/tenants/{t}/users/{uid}/aiQuota/{YYYY-MM-DD}`).
     Si está agotada → `429 quota_exhausted` + auditLog.
   - Aplica `redactPII()` al prompt.
   - Calcula hash y busca en `/tenants/{t}/aiCache/{hash}`.
     Si hit → devuelve cacheado + auditLog `ai.cache_hit`.
   - Si miss → cascada de proveedores según `preferLocal`/`strictEU`.
     Default: DeepSeek → Gemini → NAS.
   - Guarda respuesta en caché (TTL 7d implícito).
   - Escribe `aiRequests` (sin texto del prompt) y auditLog `ai.ask`.
   - Devuelve `{ answer, source, provider, remaining, euResident, redactionsApplied }`.

## Lo que **no** se hace en esta fase (queda para Fase 3+)

- Onboarding multi-tenant (panel superadmin, invitación de admins).
- Migración de colecciones legacy a `/tenants/default/**`.
- Refactor del frontend a Vite+React.
- Stripe / facturación.
- Triggers `onWrite` para auditoría automática de pacientes/notas.
- Función `deleteMyData` (derecho al olvido).
- BigQuery export.
