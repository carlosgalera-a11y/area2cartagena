# 🔒 Reglas de Seguridad Firestore

Copia estas reglas en: **Firebase Console → Firestore → Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Configuración IA - solo admins autorizados
    match /settings/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.email in ['admin@cartagena.es', 'ramongalera22@gmail.com'];
    }
    
    // Datos de la app (preguntas, notas, protocolos custom)
    match /app_data/{docId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email in ['admin@cartagena.es', 'ramongalera22@gmail.com'];
    }
    
    // Documentos subidos
    match /documentos/{docId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.token.email in ['admin@cartagena.es', 'ramongalera22@gmail.com'];
    }
  }
}
```

## Pasos:
1. Ir a https://console.firebase.google.com
2. Proyecto: docenciacartagenaeste
3. Firestore Database → Rules
4. Pegar las reglas de arriba
5. Publicar

## Activar Google Auth:
1. Authentication → Sign-in method
2. Google → Enable
3. Support email: tu email
4. Save
