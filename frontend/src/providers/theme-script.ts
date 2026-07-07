/**
 * Runs synchronously in <head>, before first paint, so the correct theme
 * is applied before the browser paints the default (light) markup Next.js
 * server-rendered. Mirrors the Next.js-documented flash-prevention pattern
 * (see the "Preventing Flash" guide bundled with this Next.js version) and
 * must stay a plain string — it is injected via dangerouslySetInnerHTML,
 * never executed through the module graph.
 */
export const THEME_STORAGE_KEY = 'itm-theme';

export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
