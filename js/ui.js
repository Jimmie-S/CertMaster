/* ═══════════════════════════════════════════
   UI HELPERS — pure DOM builder utilities, no imports
═══════════════════════════════════════════ */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'disabled' || k === 'checked') { if (v) el[k] = true; }
    else if (v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat(99)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(c) : c);
  }
  return el;
}

export function txt(s) {
  return document.createTextNode(s);
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  for (const c of children.flat(99)) {
    if (c == null || c === false) continue;
    f.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(c) : c);
  }
  return f;
}

export function resBadgeClass(type) {
  return 'res-badge ' + (type === 'official' ? 'badge-official'
    : type === 'video' ? 'badge-video' : 'badge-free');
}
