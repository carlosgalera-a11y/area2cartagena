# Checklist RGPD/LOPDGDD antes de producción

> Fuente: Plan Maestro §9. Esta versión es el subset operativo para
> Fase 0-2. Pendiente de revisión por asesor jurídico.

## Antes de aceptar **cualquier** usuario externo

- [ ] **DPA con Google Cloud** firmado (consola → Compliance Reports).
- [ ] **Región UE fija**: Firestore + Functions en `europe-west1`.
      Verificar con `gcloud firestore databases describe`.
- [ ] **Secretos en Secret Manager**, nunca en código. `git grep` para
      asegurar que no quedó ninguna `sk-...` o `Bearer` hardcoded.
- [ ] **App Check enforce** en al menos `/api/ai/ask` (cambiar a
      hard-mode tras migrar todas las páginas).
- [ ] **Cifrado en tránsito**: forzar HTTPS (Hosting lo hace por defecto).
- [ ] **Política de privacidad** publicada y enlazada en el footer
      (plantilla en `07-politica-privacidad.md`).
- [ ] **Cookie banner** mínimo (técnicas + analíticas opt-in).
- [ ] **RAT** rellenado (`06-rat.md`).
- [ ] **EIPD** redactada (datos de salud → obligatoria).
- [ ] **DPO** designado y contacto publicado.
- [ ] **Derecho al olvido** operativo (función `deleteMyData` —
      pendiente, Fase 4).
- [ ] **Portabilidad** operativa (export JSON — pendiente, Fase 4).

## Diseño defensivo aplicado en esta fase

- [x] Frontend wrapper no envía claves; siempre usa idToken.
- [x] Proxy aplica `redactPII` antes de salir a proveedor externo.
- [x] `aiRequests` y `auditLogs` guardan **hash** del prompt, nunca el
      texto.
- [x] Reglas Firestore deny-by-default para cualquier ruta nueva.
- [x] Cuota diaria por usuario para evitar abuso o coste imprevisto.
- [x] Caché por hash → reduce envíos a proveedor externo (≈40-60%).
- [ ] Validación servidor de `initials.size() <= 4` (incluida en rules
      para `/tenants/{t}/patients`; no aplica a colecciones legacy).
- [ ] Timeout de sesión 15 min — pendiente Fase 4.
- [ ] 2FA obligatorio para admin/superadmin — pendiente Fase 4.

## Riesgo residual

- **DeepSeek fuera de UE.** Mitigación: redacción previa + Gemini UE
  como fallback. Para tenants con `strictEU=true` no se usa DeepSeek.
- **App Check soft-mode temporal** durante migración. Bots podrían
  obtener un idToken válido (registrándose) y consumir cuota propia,
  pero no la de otros usuarios. Coste limitado por `maxInstances=10`
  + cuota diaria.
- **Tenant `default` compartido** mientras no haya onboarding
  multi-tenant. Adecuado para uso individual o equipo cerrado; no
  apto para múltiples centros sin Fase 3.
