# Política de Privacidad — Plantilla

> Texto base adaptado a España (Plan Maestro Anexo C). Revisar con
> asesoramiento legal antes de publicar.

---

## 1. Responsable del tratamiento

[Nombre o razón social], NIF/CIF [...], domicilio [...], email
[contacto@area2cartagena.es]. Delegado de Protección de Datos (DPO):
[nombre · email].

## 2. Datos que tratamos

- **Datos de cuenta**: email, nombre, centro sanitario, rol.
- **Datos de uso**: registros de acceso, consultas de IA, auditoría.
- **Datos clínicos anonimizados** que tú introduces voluntariamente:
  iniciales, número de cama, edad aproximada, motivo de consulta.

## 3. Finalidades y base jurídica

1. **Prestación del servicio SaaS** (Art. 6.1.b RGPD — ejecución de
   contrato).
2. **Seguridad y auditoría** (Art. 6.1.f — interés legítimo).
3. **Tratamiento de datos de salud con fines docentes-asistenciales**
   (Art. 9.2.h — el profesional que los introduce está sujeto a secreto
   y se compromete a anonimizar al paciente antes de la introducción).

## 4. Plazo de conservación

- Datos de cuenta: mientras dure el contrato + 4 años.
- Logs de auditoría: 2 años.
- Copias de seguridad: 90 días online + 1 año en almacenamiento frío.

## 5. Destinatarios

- **Google Cloud EMEA Limited** (encargado del tratamiento, UE)
  bajo DPA.
- **Stripe Payments Europe** (si aplica facturación).
- **Modelos de IA**: DeepSeek (Capa 1, fuera UE), Google Gemini
  (Capa 2, UE), opcionalmente NAS local del responsable.

## 6. Transferencias internacionales

DeepSeek opera fuera de la UE. Aplicamos cláusulas contractuales tipo
y **redacción previa del prompt** para evitar el envío de PII. El
usuario puede activar `strictEU=true` para forzar exclusivamente
proveedores con residencia UE.

## 7. Tus derechos

Acceso, rectificación, supresión, limitación, portabilidad, oposición.
Ejercer en [contacto@area2cartagena.es]. Puedes reclamar ante la AEPD
(<https://www.aepd.es>).

## 8. Medidas de seguridad

Cifrado en reposo (AES-256) y en tránsito (TLS 1.2+), App Check,
2FA obligatorio para administradores, auditoría inmutable de accesos,
backup diario, redacción de PII antes de envío externo de IA.

## 9. Cambios en esta política

Se publicarán en esta misma URL con fecha de entrada en vigor; los
cambios sustanciales se notificarán por email.

---

*Versión 1.0 · [DD-MM-AAAA]*
