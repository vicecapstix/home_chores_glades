// TV (?readonly=1): slowly auto-scroll a chore section that doesn't fit its slot (#400).
// Display only: reads layout, moves scrollTop. No Firebase access, nothing stored.
import { READONLY } from './config.js';
import { isTvDim } from './tv.js';

export const SCROLL_PX_S = 20, HOLD_MS = 4000, TICK_MS = 100, TOLERANCE_PX = 4;

export const overflowPx = (scrollH, clientH) => (scrollH - clientH > TOLERANCE_PX ? scrollH - clientH : 0);
// How many chore cards are (partly) cut off: `bottoms` are the cards' offsetTop + offsetHeight.
export const hiddenCount = (bottoms, clientH) => bottoms.filter(b => b > clientH + TOLERANCE_PX).length;

// Pure state machine: hold at the top, scroll down, hold at the bottom, jump back to the top.
export function stepScroll(s, dtMs, max) {
  if (!(max > 0)) return { pos: 0, phase: 'top', wait: 0 };
  let { pos, phase, wait } = s;
  if (phase === 'down') {
    pos = Math.min(max, pos + SCROLL_PX_S * dtMs / 1000);
    if (pos >= max) { phase = 'bottom'; wait = 0; }
  } else {
    wait += dtMs;
    if (wait >= HOLD_MS) { if (phase === 'top') phase = 'down'; else { phase = 'top'; pos = 0; } wait = 0; }
  }
  return { pos, phase, wait };
}

const fresh = () => ({ pos: 0, phase: 'top', wait: 0 });
let _st = {};
export function resetTvScroll() { _st = {}; }

const setMore = (head, n) => {
  if (!head) return;
  if (n > 0) { if (head.dataset.more !== String(n)) head.dataset.more = String(n); } else if ('more' in head.dataset) delete head.dataset.more;
};

export function tvScrollTick(dtMs, { root = document, reduced = false, dim = false, readonly = READONLY } = {}) {
  if (!readonly) return;
  root.querySelectorAll('#task-list > .section').forEach(sec => {
    const key = sec.dataset.k || sec.className, over = overflowPx(sec.scrollHeight, sec.clientHeight);
    const head = sec.querySelector('.section-head');
    if (!over) { delete _st[key]; sec.scrollTop = 0; setMore(head, 0); return; }
    if (reduced) { // no motion: say how many are cut off instead
      sec.scrollTop = 0;
      setMore(head, hiddenCount(Array.from(sec.querySelectorAll('.task-card')).map(c => c.offsetTop + c.offsetHeight), sec.clientHeight));
      return;
    }
    setMore(head, 0);
    if (dim) { _st[key] = fresh(); sec.scrollTop = 0; return; } // night mode: rest at the top
    _st[key] = stepScroll(_st[key] || fresh(), dtMs, over);
    sec.scrollTop = _st[key].pos;
  });
}

export function initTvScroll() {
  if (!READONLY) return;
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  setInterval(() => tvScrollTick(TICK_MS, { reduced: !!(mq && mq.matches), dim: isTvDim() }), TICK_MS);
}
