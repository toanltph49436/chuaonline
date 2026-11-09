/* Chùa Online · theme loader (shared by index.html and live/overlay.html)
 *
 * A theme is a folder under assets/themes/<id>/ with a theme.json manifest and its images/music.
 * Everything that depends on the painting (floor trapezoid, halo position, teachers…) lives in the
 * manifest, so a designer can ship a new hall without touching code.
 *
 * "fallback": "<other theme id>" lets a theme be delivered file by file: any image that fails to load
 * is taken from the fallback theme, together with that file's frame metadata.
 */
(function () {
  const SKINS = ['man', 'woman', 'granny', 'monk', 'nun', 'child'];
  const FX = ['halo', 'petal', 'incense', 'lotus', 'bell'];

  async function fetchMeta(base, id) {
    const r = await fetch(`${base}themes/${encodeURIComponent(id)}/theme.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`theme "${id}": HTTP ${r.status}`);
    return r.json();
  }

  // Tries each candidate [url, spec] in order; the loaded Image carries the spec of the file that won.
  // im.ready resolves true once a file loaded, false if every candidate failed.
  function image(cands) {
    const im = new Image();
    let i = 0, done;
    im.ready = new Promise(r => { done = r; });
    const next = () => {
      while (i < cands.length && !cands[i][0]) i++;
      if (i >= cands.length) { im.spec = null; done(false); return; }
      const [url, spec] = cands[i++];
      im.spec = spec || null;
      im.src = url;
    };
    im.onload = () => done(true);
    im.onerror = next;
    next();
    return im;
  }

  // Painted cushions belong to the painting: they follow whichever hall.jpg actually loaded.
  const pts = (a) => Array.isArray(a) && a.length ? a.map(p => ({ x: +p.x, y: +p.y })) : null;
  const hallSpec = (x) => x ? { seats: pts(x.seats), extra: pts(x.seatsExtra), perspective: x.perspective || null } : null;

  async function loadTheme(id, base) {
    base = base || '/assets/';
    let meta;
    try { meta = await fetchMeta(base, id || 'classic'); }
    catch (e) {
      console.warn(e.message);
      if (id && id !== 'classic') return loadTheme('classic', base);
      throw e;
    }
    let fb = null;
    if (meta.fallback && meta.fallback !== meta.id) fb = await fetchMeta(base, meta.fallback).catch(() => null);

    const dir = `${base}themes/${meta.id}/`, fdir = fb ? `${base}themes/${fb.id}/` : '';
    const own = (p) => (p ? dir + p : null), alt = (p) => (fb && p ? fdir + p : null);
    const m = Object.assign({}, fb || {}, meta);             // painting coordinates: the theme's own, else fallback's

    const A = {};
    A.hall = image([[own(meta.hall), hallSpec(meta)], [alt(fb && fb.hall), hallSpec(fb)]]);
    const cs = (meta.characters || {}).seated || {}, fcs = ((fb || {}).characters || {}).seated || {};
    for (const k of SKINS) A[k] = image([[own(cs[k])], [alt(fcs[k])]]);
    const cw = (meta.characters || {}).walk || {}, fcw = ((fb || {}).characters || {}).walk || {};
    for (const k of SKINS) {
      const a = cw[k], b = fcw[k];
      if (a || b) A['anim_' + k] = image([[own(a && a.src), a], [alt(b && b.src), b]]);
    }
    const fx = meta.fx || {}, ffx = (fb || {}).fx || {};
    for (const k of FX) A[k] = image([[own(fx[k])], [alt(ffx[k])]]);

    // music: the theme's own list if it has one, else the fallback's (a theme ships music when it is ready)
    const tracks = meta.music && meta.music.length ? meta.music.map(t => ({ src: dir + t.src, name: t.name || '' }))
      : fb && fb.music ? fb.music.map(t => ({ src: fdir + t.src, name: t.name || '' })) : [];

    return {
      id: meta.id,
      name: meta.name,
      meta: m,
      A,
      music: tracks,
      seatedHeight: ((m.characters || {}).seatedHeight) || 260,
      hasAnim: (k) => { const im = A['anim_' + k]; return !!(im && im.naturalWidth > 0 && im.spec); },
      animSpec: (k) => (A['anim_' + k] || {}).spec || null,
      hallReady: A.hall.ready,
      slots: () => (A.hall.spec && A.hall.spec.seats) || [],             // valid after hallReady
      slotsExtra: () => (A.hall.spec && A.hall.spec.seats && A.hall.spec.extra) || [],
      perspective: () => (A.hall.spec && A.hall.spec.perspective) || null,
    };
  }

  // CSS custom properties from theme.colors (only simple colour values are accepted)
  function applyColors(meta, el) {
    const c = (meta && meta.colors) || {};
    for (const [k, v] of Object.entries(c)) {
      if (/^[a-z0-9]+$/i.test(k) && /^#[0-9a-f]{3,8}$|^rgba?\([\d\s.,%]+\)$/i.test(String(v))) (el || document.documentElement).style.setProperty('--' + k, v);
    }
  }

  window.ChuaTheme = { loadTheme, applyColors, SKINS };
})();
