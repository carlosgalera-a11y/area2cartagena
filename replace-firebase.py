import os
import re

# Tu configuración real
firebase_config = '''        const firebaseConfig = {
            apiKey: "AIzaSyAvdYi6BVdltgeFH4KLHD_5iFZrSRgoykc",
            authDomain: "docenciacartagenaeste.firebaseapp.com",
            projectId: "docenciacartagenaeste",
            storageBucket: "docenciacartagenaeste.firebasestorage.app",
            messagingSenderId: "1056320755107",
            appId: "1:1056320755107:web:126637bf63c13bbb297616"
        };'''

# Archivos a actualizar
files = [
    "informacion.html",
    "factores-riesgo.html",
    "ejercicios.html",
    "enlaces-interes.html",
    "vacunas.html",
    "programacion.html",
    "dejar-fumar.html",
    "podcast.html"
]

for filename in files:
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Buscar y reemplazar la configuración
        pattern = r'const firebaseConfig = \{[^}]*?appId: "1:123456789:web:abcdef123456"[^}]*?\};'
        new_content = re.sub(pattern, firebase_config, content, flags=re.DOTALL)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ Actualizado: {filename}")
    else:
        print(f"❌ No encontrado: {filename}")

print(f"\n✅ {len(files)} archivos actualizados con Firebase config real")
