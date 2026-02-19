# 🔐 Admin Panel - Credenciales

## Acceso al Panel Administrativo

Haz clic en el botón **"🔐 Admin Login"** en cualquier página del Centro de Salud.

### Credenciales

| Campo | Valor |
|-------|-------|
| **Usuario** | `admin@cartagena.es` |
| **Contraseña** | `Cartagena2026!` |

## Funcionalidades

### 📤 Subir Archivos
- Sube documentos (PDF, DOCX, PPTX, etc.)
- Asigna a una categoría existente
- Se guardan en el proyecto

### ➕ Crear Categoría
- Agrega nuevas especialidades médicas
- Define nombre (ej: "Oncología")
- Selecciona emoji (ej: 🎗️)
- Se añade automáticamente al sidebar de Profesionales

## 🔒 Seguridad

- Las credenciales están en código (cambiar antes de producción)
- Para mayor seguridad, implementar:
  - OAuth2 con Google/Microsoft
  - Base de datos para usuarios
  - Tokens JWT
  - 2FA (autenticación de dos factores)

## 📝 Notas

- El panel NO afecta la configuración existente
- Funciona en Pacientes y Profesionales
- Los cambios son locales (sin servidor backend)
- Para persistencia, agregar Firebase/Firestore

---

_Creado: 19 Feb 2026 19:10 GMT+1_
