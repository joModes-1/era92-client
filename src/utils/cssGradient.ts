/**
 * Start/end points (fractions of the box) that reproduce a CSS
 * `linear-gradient(<angle>deg, ...)` exactly on a box of the given size.
 *
 * LinearGradient's start/end are fractions of the box, and on web it scales
 * them by the real width/height before deriving the angle — so points
 * computed for a square box bend the angle badly on a wide, short button.
 * These are the CSS gradient line's own endpoints for the real box (they can
 * lie outside 0..1), so the angle and the stop positions match CSS on both
 * web and native.
 */
export function cssGradientPoints(angleDeg: number, width: number, height: number) {
  const a = (angleDeg * Math.PI) / 180;
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  const half = (Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))) / 2;
  const dx = (half * Math.sin(a)) / w;
  const dy = (half * Math.cos(a)) / h;
  return {
    start: { x: 0.5 - dx, y: 0.5 + dy },
    end: { x: 0.5 + dx, y: 0.5 - dy },
  };
}
