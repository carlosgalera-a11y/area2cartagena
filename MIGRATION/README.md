# Migración Cartagenaeste · Static → SaaS

Este directorio agrupa la documentación de la migración descrita en el
**Plan Maestro Cartagenaeste v1.0** (20-abr-2026, Perplexity Computer).

Estado actual: **Fase 0–2 (Backend-first) en curso**. La app HTML actual
sigue funcionando en GitHub Pages sin cambios; el backend nuevo (Cloud
Functions v2 en europe-west1) corre en paralelo y ofrece el endpoint
`/api/ai/ask` para reemplazar las llamadas directas a DeepSeek /
Pollinations / OpenRouter desde el navegador.

## Documentos

| Archivo | Contenido |
|---------|-----------|
| `01-arquitectura.md` | Diagrama y decisiones de arquitectura. |
| `02-deploy.md` | Pasos de despliegue (proyecto GCP, secretos, CLI). |
| `03-frontend-migration.md` | Cómo migrar cada página HTML al proxy. |
| `04-runbook.md` | Qué hacer cuando algo falla. |
| `05-rgpd-checklist.md` | Lista RGPD/LOPDGDD antes de producción. |
| `06-rat.md` | Plantilla del Registro de Actividades de Tratamiento. |
| `07-politica-privacidad.md` | Plantilla de política de privacidad. |
| `99-status.md` | Estado de cada fase del Plan Maestro. |

## Empezar

```bash
# 1. Preparar GCP (manual, ver 02-deploy.md)
firebase login
firebase use docenciacartagenaeste

# 2. Compilar y desplegar la función `askAi`
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions:askAi,firestore:rules,firestore:indexes

# 3. Probar
curl https://docenciacartagenaeste.web.app/api/health
```

Más detalle en `02-deploy.md`.
