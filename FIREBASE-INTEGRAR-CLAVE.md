# ⚡ INTEGRAR CLAVE FIREBASE - 5 MINUTOS

Una vez que tengas la clave de Firebase, sigue estos 3 pasos.

---

## 🔑 TU CLAVE (reemplaza aquí)

Después de crear tu proyecto Firebase, tendrás algo como:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD9c-TU-CLAVE-AQUI",
  authDomain: "cartagena-este.firebaseapp.com",
  projectId: "cartagena-este",
  storageBucket: "cartagena-este.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

---

## 📝 Paso 1: Editar TODOS los HTML

Abre cada archivo y busca esta línea (~línea 100):

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyD9c-EXAMPLE-KEY-CHANGE-ME",
    authDomain: "cartagena-este.firebaseapp.com",
    projectId: "cartagena-este",
    storageBucket: "cartagena-este.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

**Reemplaza con TU clave:**

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",              ← TU apiKey
    authDomain: "cartagena-este.firebaseapp.com",
    projectId: "cartagena-este",
    storageBucket: "cartagena-este.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

---

## 📄 Archivos a Editar (8 total)

```
✅ informacion.html
✅ factores-riesgo.html
✅ ejercicios.html
✅ enlaces-interes.html
✅ vacunas.html
✅ programacion.html
✅ dejar-fumar.html
✅ podcast.html
```

---

## 🔄 Paso 2: Usar Find & Replace

**En tu editor (VS Code, Sublime, etc):**

```
Find:  "AIzaSyD9c-EXAMPLE-KEY-CHANGE-ME"
Replace: "TU_API_KEY_REAL"

Replace All: ✅
```

**Repite para cada campo:**
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId

---

## 📤 Paso 3: Commit y Push

```bash
cd cartagena-este-webapp
git add *.html
git commit -m "🔥 Integrar Firebase Config"
git push origin main:gh-pages
```

---

## ✅ ¡Listo!

Ahora las páginas funcionarán con:
- ✅ Login Gmail
- ✅ Tablón de notas
- ✅ Almacenamiento en la nube (Firestore)

---

## 🧪 Probar

```
http://localhost:8000/informacion.html
```

Clickea: **📧 Acceder con Gmail**

---

## 💡 Tips

**Rápido (2 min):**
```bash
sed -i 's/AIzaSyD9c-EXAMPLE-KEY-CHANGE-ME/YOUR_API_KEY_HERE/g' *.html
```

**Seguro:**
- No compartir clave públicamente
- Usar .gitignore si es necesario (después)
- En producción, usar secrets

---

_Para ayuda, ver: FIREBASE-SETUP.md_
