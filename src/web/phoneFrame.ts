import { Platform } from 'react-native';
import { webFrame as F } from '../theme';

/**
 * On a laptop or desktop browser, show the app inside a phone: a real phone
 * screen size (390 × 844), a status bar with a live clock and the camera
 * island, a bezel and side buttons — scaled down evenly when the window is
 * too short, never squashed. Phones and narrow windows are untouched; add
 * `?wide` to the address to use the full window instead.
 *
 * The app keeps laying out at the true phone size and is scaled with a CSS
 * transform, so what you see is exactly what a phone shows. Sheets and
 * dialogs (React Native `Modal`) are rendered by react-native-web into their
 * own <div> on <body>, outside #root, so every such div gets the same screen
 * box as #root; `transform` also makes each one the containing block for its
 * `position: fixed` content, so they open inside the phone too.
 */
export function installPhoneFrame() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (typeof location !== 'undefined' && /[?&]wide\b/.test(location.search)) return;
  if (document.getElementById('phone-frame-style')) return;

  const appH = F.screenH - F.statusH; // the app's area, under the status bar
  const shellW = F.screenW + F.bezel * 2;
  const shellH = F.screenH + F.bezel * 2;

  const style = document.createElement('style');
  style.id = 'phone-frame-style';
  style.textContent = `
html.phone-frame { height: 100%; overflow: hidden; background: ${F.page}; }
html.phone-frame body { margin: 0; height: 100%; overflow: hidden; background: ${F.page}; }
html.phone-frame body > div:not(#phone-shell) {
  position: fixed !important;
  top: 50%; left: 50%;
  width: ${F.screenW}px !important; height: ${appH}px !important;
  transform: translate(-50%, -50%) translateY(calc(${F.statusH / 2}px * var(--phone-k))) scale(var(--phone-k));
  border-radius: 0 0 ${F.radius}px ${F.radius}px;
  overflow: hidden;
  z-index: 1;
  animation: phone-in .45s ease-out both;
}
/* Portal layers sit over the app in the same box; an empty one must not
   swallow taps — only what a sheet or dialog actually renders takes them. */
html.phone-frame body > div:not(#root):not(#phone-shell) { pointer-events: none; z-index: 2; }
html.phone-frame body > div:not(#root):not(#phone-shell) > * { pointer-events: auto; }
#phone-shell {
  position: fixed; top: 50%; left: 50%; z-index: 0;
  width: ${shellW}px; height: ${shellH}px;
  transform: translate(-50%, -50%) scale(var(--phone-k));
  border-radius: ${F.radius + F.bezel}px;
  background: ${F.bezelColor};
  box-shadow: 0 0 0 2px ${F.bezelEdge}, 0 40px 90px rgba(60, 30, 150, .30), 0 12px 30px rgba(22, 32, 92, .25);
  animation: phone-in .45s ease-out both;
  pointer-events: none;
}
#phone-shell .screen {
  position: absolute; inset: ${F.bezel}px;
  border-radius: ${F.radius}px; background: #fff; overflow: hidden;
}
#phone-shell .status {
  position: absolute; top: 0; left: 0; right: 0; height: ${F.statusH}px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 30px 0 38px; box-sizing: border-box;
  font: 600 15px/1 'PlusJakartaSans_600SemiBold', system-ui, sans-serif; color: #111;
}
#phone-shell .island {
  position: absolute; top: 11px; left: 50%; transform: translateX(-50%);
  width: 118px; height: 34px; border-radius: 17px; background: #0b0b0f;
}
#phone-shell .island::after {
  content: ''; position: absolute; right: 13px; top: 11px; width: 12px; height: 12px;
  border-radius: 50%; background: radial-gradient(circle at 35% 35%, #3a4a9a, #10142e 70%);
}
#phone-shell .icons { display: flex; align-items: center; gap: 6px; }
#phone-shell .btn {
  position: absolute; width: 4px; background: ${F.bezelColor}; border-radius: 2px;
  box-shadow: inset 0 0 0 1px ${F.bezelEdge};
}
#phone-shell .btn.l { left: -4px; border-radius: 2px 0 0 2px; }
#phone-shell .btn.r { right: -4px; border-radius: 0 2px 2px 0; }
@keyframes phone-in { from { opacity: 0; } to { opacity: 1; } }
`;
  document.head.appendChild(style);

  // The phone itself: bezel, white screen, status bar and side buttons.
  const shell = document.createElement('div');
  shell.id = 'phone-shell';
  shell.setAttribute('aria-hidden', 'true');
  shell.innerHTML = `
<div class="btn l" style="top:${120 + F.bezel}px;height:30px"></div>
<div class="btn l" style="top:${178 + F.bezel}px;height:58px"></div>
<div class="btn l" style="top:${248 + F.bezel}px;height:58px"></div>
<div class="btn r" style="top:${200 + F.bezel}px;height:92px"></div>
<div class="screen">
  <div class="status">
    <span class="time"></span>
    <span class="icons">
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#111"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#111"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#111"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#111"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.3-2.6a3.2 3.2 0 0 0-4.6 0z M8 6.2c1.6 0 3 .6 4 1.6l1.6-1.8A8 8 0 0 0 8 3.8 8 8 0 0 0 2.4 6l1.6 1.8c1-1 2.4-1.6 4-1.6z M8 1.4c2.8 0 5.4 1.1 7.3 2.9L16 3.5A11.4 11.4 0 0 0 8 0 11.4 11.4 0 0 0 0 3.5l.7.8A10.6 10.6 0 0 1 8 1.4z" fill="#111"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#111" stroke-opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="#111"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="#111" fill-opacity=".45"/></svg>
    </span>
  </div>
  <div class="island"></div>
</div>`;
  document.body.appendChild(shell);

  const time = shell.querySelector('.time') as HTMLElement;
  const tick = () => {
    const d = new Date();
    time.textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  tick();
  setInterval(tick, 15000);

  // Wide enough → phone; the scale keeps the whole phone in view with a margin.
  const fit = () => {
    const wide = window.innerWidth >= F.minWindow;
    document.documentElement.classList.toggle('phone-frame', wide);
    shell.style.display = wide ? '' : 'none';
    const k = Math.min(1, (window.innerHeight - 40) / shellH, (window.innerWidth - 40) / shellW);
    document.documentElement.style.setProperty('--phone-k', String(Math.max(0.5, k)));
  };
  fit();
  window.addEventListener('resize', fit);
}
