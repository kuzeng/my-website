// Depth: the folded phone turns toward the pointer; light follows the pointer.
// Open, the device lies flat (no transform at all) so text on the big screen stays sharp.
// Performance: each frame writes only transforms on a few leaf layers (never custom properties on an ancestor, which
// would restyle the whole site), and the loop stops as soon as everything settles, so a resting pointer costs nothing.
// (An idle float used to keep the GPU redrawing the whole phone at full frame rate; it is gone for that reason.)

const deviceMode = window.matchMedia('(min-width: 1000px) and (min-height: 640px)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const rig = document.getElementById('rig')!;
const device = document.getElementById('device')!;
const slab = device.querySelector<HTMLElement>('.slab')!;
const glare = device.querySelector<HTMLElement>('.glare i')!;
const spot = document.querySelector<HTMLElement>('.spot')!;

const MAX_TILT = 6; // degrees, folded
const EASE = 0.1;   // per-frame approach toward the target
const EPS = 0.002;

// Pointer, normalised to -1..1 from the centre of the window (0,0 = centred or away).
let nx = 0, ny = 0;
// Smoothed state
let rx = 0, ry = 0, lx = 0, ly = 0;
let raf = 0;

const enabled = () => deviceMode.matches && finePointer.matches && !reduceMotion.matches;
const folded = () => !device.classList.contains('is-open') && !device.classList.contains('opening');
const approach = (from: number, to: number) => (Math.abs(to - from) < EPS ? to : from + (to - from) * EASE);

function frame() {
  raf = 0;
  if (!enabled() || document.hidden) return;
  // Open: no tilt, so the device comes to rest exactly flat.
  const isFolded = folded();
  const tx = isFolded ? -ny * MAX_TILT : 0;
  const ty = isFolded ? nx * MAX_TILT : 0;
  rx = approach(rx, tx);
  ry = approach(ry, ty);
  lx = approach(lx, nx);
  ly = approach(ly, ny);

  if (rx === 0 && ry === 0) {
    rig.style.removeProperty('transform');
    slab.style.removeProperty('translate');
  } else {
    rig.style.transform = `rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg)`;
    // The slab shows on the side turned toward you: left wall when the right edge recedes, bottom wall when the bottom comes forward.
    slab.style.translate = `${(-ry * 0.8).toFixed(2)}px ${(rx * 0.8).toFixed(2)}px`;
  }
  glare.style.translate = `${(lx * 25).toFixed(2)}% ${(ly * 25).toFixed(2)}%`;
  spot.style.translate = `${(lx * innerWidth * 0.18).toFixed(1)}px ${(ly * innerHeight * 0.18).toFixed(1)}px`;

  if (rx !== tx || ry !== ty || lx !== nx || ly !== ny) schedule();
}

function schedule() {
  if (!raf && enabled() && !document.hidden) raf = requestAnimationFrame(frame);
}

function reset() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  nx = ny = rx = ry = lx = ly = 0;
  rig.style.removeProperty('transform');
  [slab, glare, spot].forEach((el) => el.style.removeProperty('translate'));
}

window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
  if ((e.target as Element).closest?.('[data-assistant]')) { nx = ny = 0; } // reading the chat: settle down
  else {
    nx = (e.clientX / innerWidth) * 2 - 1;
    ny = (e.clientY / innerHeight) * 2 - 1;
  }
  schedule();
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { nx = ny = 0; schedule(); });
document.addEventListener('visibilitychange', schedule);
// Opening flattens the device; folding back tilts it toward the pointer again.
new MutationObserver(schedule).observe(device, { attributes: true, attributeFilter: ['class'] });
[deviceMode, finePointer, reduceMotion].forEach((mq) => mq.addEventListener('change', () => (enabled() ? schedule() : reset())));
