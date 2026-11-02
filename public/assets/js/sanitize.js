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
    'span', 'div', 'figure', 'figcaption', 'a', 'img', 'iframe'
  ]);
  const ALLOWED_ATTR = {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'title', 'style'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    span: ['style'],
    div: ['style'],
    p: ['style'],
    img_: []
  };
  const DROP_WITH_CONTENT = /<\s*(script|style|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[\s\S]*?<\s*\/\s*\1\s*>/gi;

  function lmsYoutubeVideoId(value) {
    const input = String(value || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;

    let url;
    try { url = new URL(input); } catch { return ''; }
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'].includes(url.hostname.toLowerCase())) return '';

    const pathMatch = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
    const id = url.hostname.toLowerCase().endsWith('youtu.be')
      ? url.pathname.slice(1).split('/')[0]
      : pathMatch ? pathMatch[1] : url.searchParams.get('v');
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : '';
  }

  function lmsYoutubeEmbedUrl(value) {
    const id = lmsYoutubeVideoId(value);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&playsinline=1` : '';
  }

  function safeUrl(url) {
    const v = String(url || '').trim().replace(/[\u0000-\u001f]/g, '');
    return /^(https?:\/\/|\/|#|\.\/|\.\.\/|mailto:|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(v) ? v : '';
  }

  // Deklarasi inline yang bisa membuat soal/materi tak terbaca (mis. warna putih hasil salin-tempel)
  // atau merusak tata letak. Dekorasi aman seperti perataan dan penebalan dibiarkan.
  const DROP_STYLE_PROP = /^(color|background|background-color|background-image|font-size|line-height|opacity|filter|text-shadow|visibility|position|display|z-index|mix-blend-mode)$/i;

  function sanitizeInlineStyle(value) {
    return String(value || '')
      .split(';')
      .map((decl) => decl.trim())
      .filter((decl) => {
        if (!decl || decl.indexOf(':') < 0) return false;
        if (/expression\(|javascript:|behavior\s*:|@import/i.test(decl)) return false;
        const prop = decl.slice(0, decl.indexOf(':')).trim();
        return !!prop && !DROP_STYLE_PROP.test(prop);
      })
      .join('; ');
  }

  function sanitizeAttrs(tag, attrText) {
    const allowed = ALLOWED_ATTR[tag] || [];
    const out = [];
    let iframeTitle = false;
    let iframeStyle = false;
    const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m;
    while ((m = re.exec(attrText))) {
      const name = m[1].toLowerCase();
      const value = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
      if (!allowed.includes(name)) continue;
      if (tag === 'iframe' && name === 'title') iframeTitle = true;
      if (tag === 'iframe' && name === 'src') {
        const url = lmsYoutubeEmbedUrl(value);
        if (url) out.push(`${name}="${lmsEsc(url)}"`);
        continue;
      }
      if (tag === 'iframe' && name === 'style') {
        const normalized = value.replace(/\s+/g, '').toLowerCase();
        if (normalized !== 'position:absolute;top:0;left:0;width:100%;height:100%') continue;
        out.push(`style="${lmsEsc(normalized)}"`);
        iframeStyle = true;
        continue;
      }
      if (name === 'href' || name === 'src') {
        const url = safeUrl(value);
        if (!url) continue;
        out.push(`${name}="${lmsEsc(url)}"`);
        continue;
      }
      if (name === 'style') {
        const clean = sanitizeInlineStyle(value);
        if (!clean) continue;
        out.push(`${name}="${lmsEsc(clean)}"`);
        continue;
      }
      out.push(`${name}="${lmsEsc(value)}"`);
    }
    if (tag === 'iframe') {
      if (!iframeTitle) out.push('title="Video YouTube"');
      if (!iframeStyle) out.push('style="width:100%;aspect-ratio:16/9;display:block;border:0"');
    }
    return out.length ? ' ' + out.join(' ') : '';
  }

  function lmsSanitize(html) {
    let out = String(html === undefined || html === null ? '' : html);
    out = out.replace(/<!--[\s\S]*?-->/g, '');
    out = out.replace(DROP_WITH_CONTENT, '');
    let skipIframe = false;
    out = out.replace(/<\s*\/?\s*([a-zA-Z0-9-]+)([^>]*)>/g, (whole, rawName, attrs) => {
      const name = String(rawName).toLowerCase();
      const closing = /^<\s*\//.test(whole);
      if (skipIframe) {
        if (closing && name === 'iframe') skipIframe = false;
        return '';
      }
      if (name === 'iframe' && !closing) {
        const srcMatch = attrs.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
        const src = srcMatch && (srcMatch[2] !== undefined ? srcMatch[2] : srcMatch[3] !== undefined ? srcMatch[3] : srcMatch[4]);
        if (!lmsYoutubeVideoId(src)) {
          skipIframe = !/\/\s*>$/.test(whole);
          return '';
        }
      }
      if (!ALLOWED_TAGS.has(name)) return '';
      if (closing) return `</${name}>`;
      const selfClose = /\/\s*>$/.test(whole) || name === 'br' || name === 'hr' || name === 'img';
      const iframeAttrs = name === 'iframe'
        ? ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"'
        : '';
      return `<${name}${sanitizeAttrs(name, attrs)}${iframeAttrs}${selfClose ? ' /' : ''}>`;
    });
    return out;
  }

  const api = { lmsEsc, lmsSanitize, lmsYoutubeVideoId, lmsYoutubeEmbedUrl };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.lmsEsc = lmsEsc;
  global.lmsSanitize = lmsSanitize;
  global.lmsYoutubeVideoId = lmsYoutubeVideoId;
  global.lmsYoutubeEmbedUrl = lmsYoutubeEmbedUrl;
})(typeof globalThis !== 'undefined' ? globalThis : this);
