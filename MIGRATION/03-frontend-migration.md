# Migración del frontend HTML al proxy `/api/ai/ask`

Hay 29 archivos en el repo que llaman directamente a DeepSeek,
Pollinations u OpenRouter. Esta guía explica el patrón mecánico para
sustituirlos por `AIProxy.ask(...)` sin cambiar el resto de la página.

## Inventario (a fecha de la rama)

```
app-main.js
analiticas.html
agenda-guardia.html
app.html
app-v1773346150.html
app-modules.js
backend/server.js          (ya es backend; se mantiene como referencia)
cartagena-este-webapp/notebook-local.html
corrector-clinico.html
cuadernos-ia.html
dashboard.html
index.html
notebook-local.html
notebook-local (4).html
plantillas-informes.html
privacy-policy.html
sections/page-enfermeria.html
sections/page-urgencias.html
test-deploy.sh
transcripcion.html
triaje-ia.js
api-config.js              (legacy dispatcher – mantener un tiempo)
```

## Patrón antes / después

### Antes (clave en el navegador)

```html
<script>
  fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DK   // ← clave expuesta
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {role:'system', content: SYS},
        {role:'user',   content: prompt}
      ],
      max_tokens: 1500
    })
  })
  .then(r => r.json())
  .then(j => render(j.choices[0].message.content));
</script>
```

### Después (sin clave; via proxy)

```html
<script src="/lib/ai-proxy.js"></script>
<script>
  AIProxy.ask({ prompt, systemPrompt: SYS, maxTokens: 1500 })
    .then(r => render(r.answer))
    .catch(err => {
      if (err.status === 429) toast('Has agotado tu cuota diaria de IA');
      else if (err.status === 401) location.href = '/login';
      else toast('Error IA: ' + err.message);
    });
</script>
```

Notas:
- El usuario debe estar logueado con Firebase Auth. Si no lo está,
  `AIProxy.ask` rechaza con `Error('not_authenticated')`.
- El `SYS` se puede mantener exactamente igual.
- La respuesta contiene `r.provider` (`deepseek`/`gemini`/`nas`/`cache`)
  y `r.remaining` (cuota restante hoy). Útil para mostrar barra de cuota.

## Orden recomendado de migración

1. **`triaje-ia.js`** — flujo más sensible (datos clínicos).
2. **`corrector-clinico.html`** — uso individual, fácil de probar.
3. **`cuadernos-ia.html`** — usa el dispatcher `API_CONFIG.fetchAI`.
4. **`plantillas-informes.html`**, **`transcripcion.html`**, **`analiticas.html`**.
5. **`notebook-local.html`** y **`app-main.js`** — el grueso. Tienen
   varias rutas (vision, chat, fallback). Hacer en commits pequeños.
6. **`api-config.js`** — al final. Convertirlo en wrapper fino sobre
   `AIProxy.ask` y mantener la firma `fetchAI({messages, model, ...})`
   para no tener que tocar callers.

## Migración de `api-config.js` (sugerencia)

Cuando el resto esté migrado, sustituir el cuerpo por:

```js
var API_CONFIG = {
  fetchAI: function(opts) {
    var msgs = opts.messages || [];
    var sys = '', usr = '';
    msgs.forEach(function(m) {
      if (m.role === 'system') sys += (sys ? '\n' : '') + m.content;
      else if (m.role === 'user') usr += (usr ? '\n' : '') + m.content;
    });
    return AIProxy.ask({
      prompt: usr,
      systemPrompt: sys,
      maxTokens: opts.maxTokens || 1200,
      temperature: opts.temperature || 0.3,
    }).then(function(r) {
      // Compatibilidad con el shape antiguo
      return { choices: [{ message: { content: r.answer } }], _proxy: r };
    });
  }
};
```

## Cosas a NO hacer

- **No** seguir aceptando claves del usuario en `Configuración IA`. El
  panel debe quitarse o convertirse en informativo ("Las claves ya no
  son necesarias; tu cuota es X/día").
- **No** mezclar llamadas directas a `api.deepseek.com` con
  `AIProxy.ask`. Hace muy difícil auditar.
- **No** servir prompts con PII real "porque el proxy ya redacta". La
  redacción es defensa en profundidad, no excusa para introducir DNIs.
