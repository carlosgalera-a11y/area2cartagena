# Estado del Plan Maestro

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Preparación GCP (proyecto, billing, presupuesto) | **Pendiente** (acción humana) |
| 1 | Fundación técnica (Hosting, Auth, App Check, rules base) | **Parcial** — `firebase.json`, rules, indexes y wrapper App Check listos. Falta crear el proyecto GCP y registrar el sitio en reCAPTCHA Enterprise. |
| 2 | Backend sensible (proxy IA, Secret Manager, cuota, caché) | **Hecho en código** — función `askAi`, providers, `redactPII`, cuota, caché, auditoría implementados. Pendiente desplegar y crear secretos. |
| 3 | Multi-tenant (tenants, custom claims, panel superadmin) | **No iniciado**. Reglas y estructura preparadas; falta UI y funciones de onboarding. |
| 4 | Cumplimiento sanitario (auditLogs triggers, deleteMyData, EIPD, RAT) | **Parcial** — auditoría manual desde `askAi` hecha. Falta: triggers Firestore, `deleteMyData`, RAT/EIPD firmados. |
| 5 | Escalado y observabilidad (dashboards, alertas, BigQuery) | **No iniciado**. |
| 6 | Monetización opcional (Stripe) | **No iniciado**. |

## Lo entregado en esta rama (`claude/static-to-saas-migration-wrjoH`)

```
functions/                        # Cloud Functions v2 TS, Node 20
├── package.json                  # firebase-functions ^6, firebase-admin ^12
├── tsconfig.json
├── .gitignore .eslintrc.cjs
└── src/
    ├── index.ts                  # exporta `askAi` (HTTP) en europe-west1
    ├── api.ts                    # Express router, CORS, error handler
    ├── lib/
    │   ├── admin.ts              # init Firebase Admin
    │   ├── secrets.ts            # defineSecret() de las 4 keys
    │   └── types.ts              # AuthContext, AuthedRequest
    ├── middleware/
    │   └── auth.ts               # verifyIdToken + App Check soft + rol/tenant
    ├── ai/
    │   ├── ask.ts                # handler /api/ai/ask
    │   ├── quota.ts              # cuota diaria transaccional
    │   ├── cache.ts              # cache por hash, TTL 7d
    │   ├── redact.ts             # redacción de PII (DNI, NHC, tel, ...)
    │   └── providers/
    │       ├── deepseek.ts       # Capa 1
    │       ├── gemini.ts         # Capa 2 (UE)
    │       └── nas.ts            # Capa 3 (Cloudflare Tunnel)
    └── audit/
        └── log.ts                # writeAuditLog() inmutable

lib/ai-proxy.js                   # Wrapper navegador para HTML legacy

firebase.json                     # rewrite /api/** → función askAi
.firebaserc                       # alias del proyecto
firestore.rules                   # legacy + tenants/{t}/** nuevo
firestore.indexes.json            # +4 indices nuevos

MIGRATION/                        # esta documentación
├── README.md
├── 01-arquitectura.md
├── 02-deploy.md
├── 03-frontend-migration.md
├── 04-runbook.md
├── 05-rgpd-checklist.md
├── 06-rat.md
├── 07-politica-privacidad.md
└── 99-status.md
```

## Próximos pasos accionables

1. **Tú** — Crear proyecto GCP `docenciacartagenaeste` + billing + presupuesto (Plan §5.1).
2. **Tú** — Registrar el sitio en reCAPTCHA Enterprise; obtener site-key.
3. **Tú** — Crear los 4 secretos en Secret Manager (`02-deploy.md` §1).
4. **Tú** — `firebase deploy --only firestore:rules,firestore:indexes,functions:askAi`.
5. **Tú** — Verificar `/api/health` y `/api/ai/ask` (curl con idToken).
6. **Conmigo** — Migrar 2-3 páginas piloto al wrapper `AIProxy.ask` (`triaje-ia.js`, `corrector-clinico.html`, `cuadernos-ia.html`).
7. **Conmigo** — Convertir App Check a hard-enforce y eliminar el panel "Configuración IA" del frontend.
8. **Conmigo** — Iniciar Fase 3 (multi-tenant): `inviteAdmin`, `setUserClaims`, panel superadmin.

## Lo que **no** está en esta rama (deliberadamente)

- Migración de los 29 HTMLs/JS que llaman directamente a DeepSeek/etc.
  Sería un commit gigantesco de bajo valor por iteración. Mejor en
  PRs pequeños tras desplegar el backend.
- Refactor a Vite+React (Plan §6). Backend-first deja la app actual
  intacta; el frontend SPA es trabajo de Fase 3-4.
- Function `deleteMyData`, triggers de auditoría sobre pacientes/notas,
  Stripe webhooks. Quedan para Fase 4-6.
