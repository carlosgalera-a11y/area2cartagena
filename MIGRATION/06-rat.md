# Registro de Actividades de Tratamiento (RAT)

> Plantilla orientativa basada en Plan Maestro Anexo D. Adaptar con
> asesoramiento legal antes de firmar.

## Tratamiento principal — Plataforma Cartagenaeste

| Campo | Contenido |
|---|---|
| **Nombre del tratamiento** | Prestación del SaaS docente-asistencial Cartagenaeste |
| **Responsable** | [Carlos Galera Román], NIF [...], domicilio [...], contacto [...] |
| **DPO** | [Nombre, email] · obligatorio si hay tratamiento a gran escala de datos de salud |
| **Encargado(s)** | Google Cloud EMEA Limited (infraestructura, DPA firmado); Stripe Payments Europe (si se activa Fase 6) |
| **Finalidades** | (1) Soporte clínico docente · (2) Seguridad y auditoría · (3) Facturación |
| **Base jurídica** | Art. 6.1.b RGPD (ejecución de contrato) · Art. 6.1.f (interés legítimo en seguridad) · Art. 9.2.h (asistencia sanitaria con profesional sujeto a secreto) · LOPDGDD Art. 9 |
| **Categorías de interesados** | Profesionales sanitarios usuarios de la plataforma; pacientes anonimizados (iniciales + cama) |
| **Categorías de datos** | Identificativos del profesional (email, nombre); datos de uso (logs, accesos); datos de salud anonimizados (iniciales, cama, edad aproximada, motivo, notas) |
| **Destinatarios** | Google Cloud EMEA (UE), DeepSeek (transferencia internacional con redacción previa), Google Gemini (UE), opcionalmente NAS local del responsable |
| **Transferencias internacionales** | Sí · DeepSeek Asia → cláusulas contractuales tipo + redacción previa de PII en el proxy |
| **Plazos de conservación** | Cuenta: duración del contrato + 4 años · auditLogs: 2 años · backups Firestore: 90 días online + 1 año archive |
| **Medidas técnicas y organizativas** | Cifrado en reposo (AES-256) y tránsito (TLS 1.2+), App Check, 2FA admin, backup diario, EIPD anual, política de contraseñas, formación obligatoria al admin del tenant |

## Otros tratamientos (a registrar cuando se activen)

- **Atención de derechos RGPD** — registro de solicitudes de
  acceso/rectificación/supresión y respuestas.
- **Notificaciones por email** — vía función `enviarConfirmacionCita`
  (legacy) y `inviteAdmin` (Fase 3).
- **Facturación** — Stripe customer + payment data, Fase 6.
