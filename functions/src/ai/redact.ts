/**
 * Redaccion previa al envio del prompt a un proveedor IA externo.
 * Elimina patrones con forma de PII tipica espanola (DNI, NIE, NHC,
 * telefono, email, fecha de nacimiento). Es una capa de defensa adicional
 * — los profesionales NO deben introducir PII en primer lugar.
 *
 * No es perfecto. Su objetivo es minimizar la fuga si el operador olvida
 * la regla de "solo iniciales + cama".
 */

const PATTERNS: Array<[RegExp, string]> = [
  // DNI: 8 digitos + letra. NIE: X/Y/Z + 7 digitos + letra.
  [/\b[XYZ]?\d{7,8}[A-HJ-NP-TV-Z]\b/gi, '[REDACTED_DNI]'],
  // Telefono espanol: +34 o 9 digitos empezando por 6/7/8/9
  [/\b(?:\+?34[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, '[REDACTED_TEL]'],
  // Email
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]'],
  // Numero de Historia Clinica (heuristica laxa: NHC seguido de 6-10 digitos)
  [/\bNHC\s*[:#]?\s*\d{6,10}\b/gi, '[REDACTED_NHC]'],
  // Fecha de nacimiento explicita (dd/mm/aaaa o dd-mm-aaaa)
  [/\b(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-](19|20)\d{2}\b/g, '[REDACTED_DATE]'],
  // IBAN espanol
  [/\bES\d{2}[\s]?(?:\d{4}[\s]?){5}\b/g, '[REDACTED_IBAN]'],
  // Tarjeta sanitaria (CIPA): formato variable; cubrimos prefijo CIPA + alfanumerico
  [/\bCIPA\s*[:#]?\s*[A-Z0-9]{8,15}\b/gi, '[REDACTED_CIPA]'],
];

export interface RedactResult {
  text: string;
  redactionsApplied: Array<{ kind: string; count: number }>;
  totalRedactions: number;
}

const KIND_FROM_TAG: Record<string, string> = {
  '[REDACTED_DNI]': 'dni',
  '[REDACTED_TEL]': 'tel',
  '[REDACTED_EMAIL]': 'email',
  '[REDACTED_NHC]': 'nhc',
  '[REDACTED_DATE]': 'date',
  '[REDACTED_IBAN]': 'iban',
  '[REDACTED_CIPA]': 'cipa',
};

export function redactPII(input: string): RedactResult {
  let text = input;
  const counts: Record<string, number> = {};

  for (const [pattern, replacement] of PATTERNS) {
    let matches = 0;
    text = text.replace(pattern, () => {
      matches++;
      return replacement;
    });
    if (matches > 0) {
      const kind = KIND_FROM_TAG[replacement] || replacement;
      counts[kind] = (counts[kind] || 0) + matches;
    }
  }

  const redactionsApplied = Object.entries(counts).map(([kind, count]) => ({ kind, count }));
  const totalRedactions = redactionsApplied.reduce((s, r) => s + r.count, 0);
  return { text, redactionsApplied, totalRedactions };
}
