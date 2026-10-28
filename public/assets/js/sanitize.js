// Helper escape + sanitasi HTML allowlist. Tanpa dependensi, bisa diuji di Node.
(function (global) {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function lmsEsc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/[&<>"']/g, (c) => ESC[c]);
  }

  const ALLOWED_TAGS = new Set([
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
    'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'code', 'pre',
    'sup', 'sub', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'figure', 'figcaption', 'a', 'img'
  ]);
  const ALLOWED_ATTR = {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    span: ['style'],
    div: ['style'],
    p: ['style'],
    img_: []
  };
  const DROP_WITH_CONTENT = /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[\s\S]*?<\s*\/\s*\1\s*>/gi;

  function safeUrl(url) {
    const v = String(url || '').trim().replace(/[\u0000-\u001f]/g, '');
    return /^(https?:\/\/|\/|#|\.\/|\.\.\/|mailto:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(v) ? v : '';
  }

  function sanitizeAttrs(tag, attrText) {
    const allowed = ALLOWED_ATTR[tag] || [];
    const out = [];
    const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m;
    while ((m = re.exec(attrText))) {
      const name = m[1].toLowerCase();
      const value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
      if (!allowed.includes(name)) continue;
      if (name === 'href' || name === 'src') {
        const url = safeUrl(value);
        if (!url) continue;
        out.push(`${name}="${lmsEsc(url)}"`);
        continue;
      }
      if (name === 'style' && /expression\(|javascript:|url\s*\(\s*['"]?\s*javascript:/i.test(value)) continue;
      out.push(`${name}="${lmsEsc(value)}"`);
    }
    return out.length ? ' ' + out.join(' ') : '';
  }

  function lmsSanitize(html) {
    let out = String(html === undefined || html === null ? '' : html);
    out = out.replace(/<!--[\s\S]*?-->/g, '');
    out = out.replace(DROP_WITH_CONTENT, '');
    out = out.replace(/<\s*\/?\s*([a-zA-Z0-9-]+)([^>]*)>/g, (whole, rawName, attrs) => {
      const name = String(rawName).toLowerCase();
      const closing = /^<\s*\//.test(whole);
      if (!ALLOWED_TAGS.has(name)) return '';
      if (closing) return `</${name}>`;
      const selfClose = /\/\s*>$/.test(whole) || name === 'br' || name === 'hr' || name === 'img';
      return `<${name}${sanitizeAttrs(name, attrs)}${selfClose ? ' /' : ''}>`;
    });
    return out;
  }

  const api = { lmsEsc, lmsSanitize };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.lmsEsc = lmsEsc;
  global.lmsSanitize = lmsSanitize;
})(typeof globalThis !== 'undefined' ? globalThis : this);
