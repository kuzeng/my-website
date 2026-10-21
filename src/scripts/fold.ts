// The fold: open and close the device on desktop, like iPhone Duo.
//   Unfold: drag "slide to unfold" right, scroll, swipe right with two fingers, Enter/→ on the knob, or follow an in-page link.
//   Fold:   the ‹ back button, swipe left with two fingers, or Esc.
//   The assistant can also open the device to a section ('duo:navigate') and fold it back ('duo:fold').
// Dragging drives the hinge directly, so the fold follows your finger in both directions.

const deviceMode = window.matchMedia('(min-width: 1000px) and (min-height: 640px)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const device = document.getElementById('device')!;
const cover = document.getElementById('cover')!;
const innerParts = [document.getElementById('about-face')!, document.getElementById('content-half')!];
const content = document.getElementById('content')!;

const DURATION = 950;
let busy = false;

const isOpen = () => device.classList.contains('is-open');
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, reduceMotion.matches ? 0 : ms));

function syncInert() {
  // Only the screen you can see is reachable by keyboard and screen readers.
  const on = deviceMode.matches;
  const showingInner = isOpen() || device.classList.contains('opening');
  cover.inert = on && showingInner;
  innerParts.forEach((el) => (el.inert = on && !showingInner));
}

function scrollToTarget(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const behavior: ScrollBehavior = reduceMotion.matches ? 'auto' : 'smooth';
  // Scroll only the pane that holds the target. scrollIntoView also scrolls ancestors when the pane bottoms out
  // (e.g. Contact, the last section), which slid the whole screen and tab bar up and left empty space below.
  const pane = deviceMode.matches ? el.closest<HTMLElement>('.pane') : null;
  if (!pane) return el.scrollIntoView({ behavior, block: 'start' });
  const pad = parseFloat(getComputedStyle(pane).scrollPaddingTop) || 0;
  // Screen distances shrink when the device is scaled (the assistant's Stage Manager layout); convert back to layout px.
  const scale = pane.getBoundingClientRect().height / pane.offsetHeight || 1;
  const top = (el.getBoundingClientRect().top - pane.getBoundingClientRect().top) / scale + pane.scrollTop - pad;
  pane.scrollTo({ top: Math.max(0, top), behavior });
}

function clearDrag() {
  device.classList.remove('dragging');
  device.style.removeProperty('--p');
}

async function open(targetId: string | null = null) {
  if (isOpen() || busy) return;
  busy = true;
  clearDrag();
  device.classList.add('opening');
  syncInert();
  await wait(DURATION);
  device.classList.add('is-open');
  device.classList.remove('opening');
  busy = false;
  syncInert();
  showHintOnce();
  if (targetId) scrollToTarget(targetId);
  else {
    // Start the new screen at the top, with focus on its first control (the ‹ back button), as iOS does.
    document.querySelector('.pane-left')?.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>('[data-fold]')?.focus({ preventScroll: true });
  }
}

async function close() {
  if ((!isOpen() && !device.classList.contains('dragging')) || busy) return;
  busy = true;
  clearDrag();
  device.classList.remove('is-open');
  syncInert();
  await wait(DURATION);
  busy = false;
  content.scrollTop = 0;
  document.querySelector<HTMLButtonElement>('[data-slider="open"] [data-knob]')?.focus({ preventScroll: true });
  if (location.hash) history.replaceState(null, '', location.pathname);
}

// --- Sliders: right opens, left closes (like Apple's own iPhone Duo slider) ---
document.querySelectorAll<HTMLElement>('[data-slider]').forEach((track) => {
  const opening = track.dataset.slider === 'open';
  const knob = track.querySelector<HTMLButtonElement>('[data-knob]')!;
  let startX = 0;
  let max = 0;
  let dragging = false;
  let moved = false;
  let progress = 0; // 0..1 along the track

  knob.addEventListener('pointerdown', (e) => {
    if (!deviceMode.matches || busy || isOpen() !== !opening) return;
    dragging = true;
    moved = false;
    progress = 0;
    startX = e.clientX;
    max = track.clientWidth - knob.offsetWidth - 8;
    knob.setPointerCapture?.(e.pointerId);
    device.style.setProperty('--p', opening ? '0' : '1');
    device.classList.add('dragging');
    if (!opening) device.classList.remove('is-open'); // let the hinge follow the drag
  });
  knob.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - startX) * (opening ? 1 : -1);
    const d = Math.min(Math.max(dx, 0), max);
    if (d > 3) moved = true;
    progress = d / max;
    knob.style.setProperty('--knob-x', `${opening ? d : -d}px`);
    // The last stretch finishes on release, so letting go always settles smoothly.
    device.style.setProperty('--p', String(opening ? progress * 0.85 : 1 - progress * 0.85));
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    knob.style.removeProperty('--knob-x');
    if (!moved) { // a plain press: just do it
      if (opening) { clearDrag(); open(); } else { device.classList.add('is-open'); clearDrag(); close(); }
      return;
    }
    const commit = progress > 0.3;
    if (opening) {
      if (commit) open(); else clearDrag();
    } else if (commit) {
      close();
    } else {
      // Snap back open.
      clearDrag();
      device.classList.add('opening');
      wait(DURATION / 2).then(() => { device.classList.add('is-open'); device.classList.remove('opening'); syncInert(); });
    }
  };
  knob.addEventListener('pointerup', end);
  knob.addEventListener('pointercancel', end);
  knob.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opening ? open() : close(); }
    if (e.key === 'ArrowRight' && opening) { e.preventDefault(); open(); }
    if (e.key === 'ArrowLeft' && !opening) { e.preventDefault(); close(); }
  });
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && deviceMode.matches && isOpen()) close(); });
document.querySelector('[data-fold]')?.addEventListener('click', () => close());

// The first time someone unfolds, briefly say how to fold back (most people expect the reverse gesture).
const hint = document.querySelector<HTMLElement>('[data-fold-hint]');
function showHintOnce() {
  if (!hint) return;
  try { if (sessionStorage.getItem('fold-hint')) return; sessionStorage.setItem('fold-hint', '1'); } catch { /* storage blocked: show anyway */ }
  window.setTimeout(() => hint.classList.add('show'), 500);
  window.setTimeout(() => hint.classList.remove('show'), 4500);
}

// --- Trackpad: scroll or swipe right to unfold, swipe left to fold ---
let sumX = 0;
let sumY = 0;
let gestureTimer = 0;
window.addEventListener('wheel', (e) => {
  if (!deviceMode.matches || busy) return;
  if ((e.target as Element).closest?.('[data-assistant]')) return; // scrolling the assistant's chat isn't a fold gesture
  sumX += e.deltaX;
  sumY += e.deltaY;
  window.clearTimeout(gestureTimer);
  gestureTimer = window.setTimeout(() => { sumX = 0; sumY = 0; }, 250);
  const horizontal = Math.abs(sumX) > Math.abs(sumY) * 1.5;
  if (!isOpen()) {
    // Fingers moving right (deltaX < 0), or any deliberate scroll, opens.
    if ((horizontal && sumX < -50) || (!horizontal && Math.abs(sumY) > 40)) { sumX = sumY = 0; open(); }
  } else if (horizontal && sumX > 60) {
    sumX = sumY = 0;
    close();
  }
}, { passive: true });

// --- In-page links (Live Activity, tabs, deep links) open first, then scroll ---
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
  if (!a || !deviceMode.matches) return;
  const url = new URL(a.href);
  if (url.pathname !== location.pathname || !url.hash) return;
  const id = decodeURIComponent(url.hash.slice(1));
  if (!document.getElementById(id)) return;
  e.preventDefault();
  history.replaceState(null, '', url.hash);
  if (isOpen()) scrollToTarget(id);
  else open(id);
});

// --- The assistant (src/scripts/assistant.ts) can show a section, and undo that by folding back ---
document.addEventListener('duo:navigate', (e) => {
  const id = (e as CustomEvent<{ id: string }>).detail?.id;
  if (!id || !document.getElementById(id) || !deviceMode.matches) return;
  history.replaceState(null, '', `#${id}`);
  if (isOpen()) scrollToTarget(id);
  else open(id);
});
document.addEventListener('duo:fold', () => { if (deviceMode.matches) close(); });

if (location.hash && deviceMode.matches) {
  const id = decodeURIComponent(location.hash.slice(1));
  requestAnimationFrame(() => scrollToTarget(id));
}

// --- Status bar clock: real local time in the Bay Area (no-JS shows the classic 9:41) ---
const clocks = document.querySelectorAll<HTMLElement>('[data-clock]');
const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
function tick() {
  const t = fmt.format(new Date()).replace(/\s?[AP]M$/, '');
  clocks.forEach((c) => (c.textContent = t));
}
tick();
window.setInterval(tick, 20_000);

deviceMode.addEventListener('change', syncInert);
syncInert();
