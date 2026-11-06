import { Platform } from 'react-native';
import { webFrame } from '../theme';

/**
 * On a laptop or desktop browser, show the app the way it is meant to be
 * seen: a phone-sized screen in the middle of the page, not a phone layout
 * stretched across 1400 pixels. Phones and narrow windows are untouched.
 *
 * The frame is put on <body> rather than around the React tree because the
 * app's sheets and dialogs (React Native `Modal`) are rendered by
 * react-native-web into a portal on <body>; `transform` makes <body> the
 * containing block for their `position: fixed`, so they open inside the
 * phone too. Add `?wide` to the address to use the full window instead.
 */
export function installPhoneFrame() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (typeof location !== 'undefined' && /[?&]wide\b/.test(location.search)) return;
  if (document.getElementById('phone-frame-style')) return;

  const style = document.createElement('style');
  style.id = 'phone-frame-style';
  style.textContent = `
@media (min-width: 700px) {
  html {
    height: 100%;
    background: ${webFrame.page};
    /* Without its own overflow, <html> takes over <body>'s and the frame
       stops clipping: the closed side menu would show beside the phone. */
    overflow: hidden;
  }
  body {
    width: ${webFrame.width}px;
    height: min(${webFrame.maxHeight}px, calc(100vh - 48px));
    margin: 24px auto !important;
    position: relative;
    overflow: hidden;
    border-radius: ${webFrame.radius}px;
    transform: translateZ(0);
    box-shadow: 0 0 0 ${webFrame.bezel}px ${webFrame.bezelColor}, 0 30px 80px rgba(60, 30, 150, 0.28);
  }
  #root { height: 100% !important; }
}`;
  document.head.appendChild(style);
}
