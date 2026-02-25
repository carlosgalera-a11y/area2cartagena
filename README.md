# 🏥 Área II Cartagena — App Médica Docente

**App médica docente para profesionales sanitarios del Área II de Cartagena** (Servicio Murciano de Salud). Herramienta de apoyo a la docencia en el Centro de Salud Cartagena Este y centros de salud del área sanitaria.

🔗 **[Acceder a la App](https://ramongalera22-ai.github.io/Cartagenaeste/notebook-local.html)** · 📱 **[Descargar para Android](https://ramongalera22-ai.github.io/Cartagenaeste/descargar.html)** · 📋 **[Política de Privacidad](https://ramongalera22-ai.github.io/Cartagenaeste/privacidad.html)**

---

## ¿Qué es Área II Cartagena App?

Aplicación web progresiva (PWA) diseñada como herramienta docente para **médicos residentes (MIR), médicos de familia (MFyC), enfermería y profesionales sanitarios** del Área de Salud II de Cartagena. Incluye protocolos de urgencias, inteligencia artificial para análisis de imagen médica, gestión de pacientes de guardia y directorio telefónico del área sanitaria.

> ⚠️ **Uso exclusivamente docente.** No sustituye el criterio clínico profesional. Las herramientas de IA son orientativas y están destinadas al aprendizaje.

---

## 🩺 Funcionalidades principales

### 📋 77 Protocolos de Urgencias
Protocolos clínicos de actuación en urgencias organizados por especialidad:
- **Cardiología**: Dolor torácico, SCA, arritmias, insuficiencia cardíaca, TEP, síncope
- **Neurología**: Ictus, crisis epiléptica, cefalea, meningitis, alteración consciencia
- **Respiratorio**: Disnea aguda, asma, EPOC, neumotórax, hemoptisis
- **Digestivo**: Hemorragia digestiva, abdomen agudo, pancreatitis, ascitis
- **Traumatología**: Fracturas, luxaciones, traumatismo craneal, politraumatizado
- **Nefrología/Urología**: Cólico renal, insuficiencia renal aguda, RAO
- **Endocrinología**: Cetoacidosis, hipoglucemia, crisis tirotóxica
- **Infecciosas**: Sepsis, neumonía, ITU, celulitis, meningitis
- **Psiquiatría**: Agitación psicomotriz, intento autolítico, crisis de ansiedad
- **Pediatría**: Fiebre, bronquiolitis, convulsiones febriles, deshidratación
- Y muchos más...

### 🤖 Análisis de Imagen Médica con IA (6 modalidades)
Herramientas de inteligencia artificial docente basadas en modelos open-source:
- **Radiografía de Tórax** — TorchXRayVision (14 patologías)
- **Dermatología** — ConvNeXt ISIC (lesiones cutáneas)
- **Radiografía Ósea** — MURA DenseNet-169 (detección anomalías musculoesqueléticas)
- **Radiografía de Abdomen** — Análisis radiológico abdominal
- **ECG** — xresnet1d101 PTB-XL (interpretación electrocardiograma)
- **Ecografía** — EchoNet / MONAI (análisis ecográfico)

### 👥 Gestión de Pacientes de Guardia
- Registro de pacientes con motivo de consulta, evolución y plan
- Cambios de guardia con trazabilidad
- Datos anonimizados y temporales

### 📞 Directorio Telefónico
Teléfonos de contacto del Área II de Cartagena:
- Hospital Santa Lucía y Hospital Rosell
- Centros de salud del área sanitaria
- Servicios de urgencias, laboratorio, radiología
- Coordinación de equipos de atención primaria (EAP)

### 🧮 Calculadoras Médicas
Herramientas de cálculo clínico integradas para uso docente.

---

## 📱 Instalación

### Android (APK)
1. Descarga el APK desde la [página de descarga](https://ramongalera22-ai.github.io/Cartagenaeste/descargar.html)
2. Permite la instalación desde fuentes desconocidas
3. Instala y accede con tu cuenta Google autorizada

### PWA (cualquier dispositivo)
1. Abre [la app](https://ramongalera22-ai.github.io/Cartagenaeste/notebook-local.html) en Chrome/Safari
2. **Android**: Pulsa "Instalar" en el banner o Menú → "Añadir a pantalla de inicio"
3. **iPhone/iPad**: Pulsa Compartir ⬆️ → "Añadir a pantalla de inicio"

### Requisitos
- Cuenta Google autorizada (control de acceso)
- Conexión a internet (funcionalidades offline limitadas)
- Navegador moderno (Chrome, Safari, Firefox, Edge)

---

## 🔐 Seguridad y Privacidad

- **Autenticación**: Google Sign-In (OAuth 2.0)
- **Base de datos**: Firebase Firestore (servidor EU-west1, cumplimiento RGPD)
- **Imágenes IA**: Procesadas en tiempo real, nunca almacenadas
- **No se recogen**: datos clínicos de pacientes reales, ubicación, cookies de seguimiento
- **Cifrado**: HTTPS/TLS en todas las comunicaciones
- **RGPD**: Cumplimiento total del Reglamento UE 2016/679

📋 [Política de Privacidad](https://ramongalera22-ai.github.io/Cartagenaeste/privacidad.html) · 🗑️ [Eliminación de cuenta](https://ramongalera22-ai.github.io/Cartagenaeste/eliminar-cuenta.html)

---

## 🏗️ Tecnología

| Componente | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (vanilla) |
| Autenticación | Firebase Auth + Google Sign-In |
| Base de datos | Firebase Firestore |
| IA / Vision | Groq API (modelos open-source) |
| Hosting | GitHub Pages |
| PWA | Service Worker, Web App Manifest |
| Android | TWA (Trusted Web Activity) vía PWABuilder |

---

## 🌍 Área de Salud II de Cartagena

El Área de Salud II de Cartagena (Servicio Murciano de Salud - SMS) comprende:

- **Complejo Hospitalario Universitario de Cartagena**: Hospital General Universitario Santa Lucía y Hospital General Universitario Santa María del Rosell
- **16 centros de salud**: Cartagena Este (Virgen de la Caridad), Cartagena Oeste, Cartagena Casco, La Unión, Los Dolores, San Antón, Barrio de Peral, La Manga, Los Alcázares, San Javier, Torre Pacheco, Fuente Álamo, La Aljorra, Los Belones, Cabo de Palos, Pozo Estrecho
- **43 consultorios**: La Aparecida, La Puebla, El Algar, La Palma, Isla Plana, y más
- **Docencia MFyC**: Unidad Docente Multiprofesional de Atención Familiar y Comunitaria

---

## 📬 Contacto

- **Email**: ramongalera22@gmail.com
- **Web**: [ramongalera22-ai.github.io/Cartagenaeste](https://ramongalera22-ai.github.io/Cartagenaeste/)

---

## 📝 Licencia

MIT — Uso libre para fines docentes y educativos.

---

**Última actualización**: 25 de febrero de 2026

*App médica docente · Área II Cartagena · Centro de Salud Cartagena Este · Protocolos de urgencias · Docencia Cartagena Este · Servicio Murciano de Salud · Atención Primaria Cartagena · App médica Area 2 Cartagena*
