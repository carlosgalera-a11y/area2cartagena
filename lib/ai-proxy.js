/* ══════════════════════════════════════════════════════════════════════
   lib/ai-proxy.js — Cliente navegador para el proxy IA de Cartagenaeste
   ──────────────────────────────────────────────────────────────────────
   Expone window.AIProxy con:
     - AIProxy.ask({ prompt, systemPrompt, preferLocal, strictEU })
         → { answer, source, provider, remaining, euResident, redactionsApplied }
     - AIProxy.me()           → info del usuario autenticado
     - AIProxy.isConfigured() → true si hay endpoint configurado
   Requisitos:
     - Firebase Auth (compat o v9 modular) cargado y con usuario logueado.
     - window.AI_PROXY_BASE  (ej. "https://area2cartagena.es" o "" para same-origin)
     - Opcionalmente window.firebaseAppCheck para enviar el token App Check.
   Diseño:
     - NUNCA usa ni pide claves de IA en el navegador.
     - Anexa Authorization: Bearer <idToken> y X-Firebase-AppCheck si esta disponible.
     - Timeout configurable (default 60s).
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var DEFAULT_TIMEOUT_MS = 60000;

  function getBase() {
    if (typeof global.AI_PROXY_BASE === 'string') return global.AI_PROXY_BASE.replace(/\/$/, '');
    // Por defecto: mismo origen (sirve en Firebase Hosting con rewrite /api/**).
    return '';
  }

  function getCurrentUser() {
    // Soporte Firebase compat (firebase.auth()) o v9 (window.firebaseAuth).
    try {
      if (global.firebase && typeof global.firebase.auth === 'function') {
        return global.firebase.auth().currentUser || null;
      }
    } catch (_) {}
    try {
      if (global.firebaseAuth && global.firebaseAuth.currentUser) {
        return global.firebaseAuth.currentUser;
      }
    } catch (_) {}
    return null;
  }

  async function getIdToken() {
    var user = getCurrentUser();
    if (!user) throw new Error('not_authenticated');
    if (typeof user.getIdToken === 'function') return user.getIdToken(false);
    throw new Error('cannot_fetch_id_token');
  }

  async function getAppCheckToken() {
    try {
      if (global.firebaseAppCheck && typeof global.firebaseAppCheck.getToken === 'function') {
        var t = await global.firebaseAppCheck.getToken();
        return (t && t.token) || null;
      }
    } catch (_) {}
    return null;
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('timeout_' + ms + 'ms'));
      }, ms);
      promise.then(
        function (v) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(v);
        },
        function (e) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }

  async function callApi(path, opts) {
    opts = opts || {};
    var base = getBase();
    var url = base + path;

    var idToken = await getIdToken();
    var appCheck = await getAppCheckToken();

    var headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + idToken,
    };
    if (appCheck) headers['X-Firebase-AppCheck'] = appCheck;

    var init = {
      method: opts.method || 'POST',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit',
    };

    var res = await withTimeout(fetch(url, init), opts.timeoutMs || DEFAULT_TIMEOUT_MS);
    var data;
    try {
      data = await res.json();
    } catch (_) {
      data = { error: 'bad_json', status: res.status };
    }
    if (!res.ok) {
      var err = new Error(data.error || ('http_' + res.status));
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  var AIProxy = {
    isConfigured: function () {
      // Consideramos configurado si hay rewrite same-origin o base absoluta.
      return typeof global.AI_PROXY_BASE !== 'undefined' || window.location.protocol.startsWith('http');
    },

    /**
     * Envia un prompt al proxy IA.
     * @param {Object} opts
     * @param {string} opts.prompt              Obligatorio, <=8000 chars.
     * @param {string} [opts.systemPrompt]      Instruccion de sistema.
     * @param {boolean} [opts.preferLocal]      Ordena NAS > DeepSeek > Gemini.
     * @param {boolean} [opts.strictEU]         Fuerza solo proveedores UE.
     * @param {number}  [opts.maxTokens]        1..4096
     * @param {number}  [opts.temperature]      0..2
     * @param {number}  [opts.timeoutMs]        default 60000
     */
    ask: function (opts) {
      opts = opts || {};
      if (!opts.prompt) return Promise.reject(new Error('prompt_required'));
      return callApi('/api/ai/ask', {
        body: {
          prompt: String(opts.prompt),
          systemPrompt: opts.systemPrompt || '',
          preferLocal: !!opts.preferLocal,
          strictEU: !!opts.strictEU,
          maxTokens: opts.maxTokens,
          temperature: opts.temperature,
        },
        timeoutMs: opts.timeoutMs || DEFAULT_TIMEOUT_MS,
      });
    },

    me: function () {
      return callApi('/api/me', { method: 'GET' });
    },

    health: function () {
      var base = getBase();
      return fetch(base + '/api/health').then(function (r) {
        return r.json();
      });
    },
  };

  global.AIProxy = AIProxy;

  // Log breve para detectar si alguna pagina lo ha cargado.
  try {
    console.log('[AIProxy] loaded (base=' + (getBase() || 'same-origin') + ')');
  } catch (_) {}
})(typeof window !== 'undefined' ? window : this);
