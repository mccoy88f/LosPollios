import { UI_THEME_COOKIE } from '@/lib/theme'

/** Applica il tema prima del paint per evitare flash bianco. */
export function ThemeScript() {
  const script = `
(function() {
  var m = document.cookie.match(/${UI_THEME_COOKIE}=([^;]+)/);
  var p = m ? m[1] : 'system';
  var dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
})();
`.trim()

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
