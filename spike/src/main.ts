/*
 * Buffered, Phase 0 spike. Throwaway.
 *
 * Answers three questions about one controller in one browser:
 *   1. What does the controller send?
 *   2. How finely can a page time it?
 *   3. Is there a better input path than reading the pad once per display frame?
 *
 * It applies no game rules and does no SOCD cleaning. It only shows what
 * arrives. Nothing here is meant to survive into the real app.
 */

// ---------------------------------------------------------------- helpers

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

const f1 = (n: number): string => n.toFixed(1);
const f3 = (n: number): string => n.toFixed(3);

const lastText = new Map<string, string>();
function setText(id: string, text: string): void {
  if (lastText.get(id) === text) return;
  lastText.set(id, text);
  el(id).textContent = text;
}

function push(arr: number[], value: number, cap = 20000): void {
  arr.push(value);
  if (arr.length > cap) arr.splice(0, cap / 10);
}

function pushLine(arr: string[], line: string, cap = 30): void {
  arr.push(line);
  if (arr.length > cap) arr.shift();
}

interface Stats {
  n: number;
  min: number;
  p01: number;
  median: number;
  p99: number;
  max: number;
  mean: number;
  sd: number;
}

function stats(values: number[]): Stats | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const at = (p: number): number => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
  return { n: s.length, min: s[0], p01: at(0.01), median: at(0.5), p99: at(0.99), max: s[s.length - 1], mean, sd };
}

function fmtStats(s: Stats | null): string {
  if (!s) return 'no samples yet';
  return `n=${s.n} median=${f3(s.median)} mean=${f3(s.mean)} sd=${f3(s.sd)} min=${f3(s.min)} p01=${f3(s.p01)} p99=${f3(s.p99)} max=${f3(s.max)} ms`;
}

function nums(values: number[], digits = 1, last = 80): string {
  return values.slice(-last).map((v) => v.toFixed(digits)).join(' ');
}

function histogram(values: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    const bucket = `${Math.round(v)}ms`;
    out[bucket] = (out[bucket] ?? 0) + 1;
  }
  return out;
}

// ------------------------------------------------------------ environment

function measurePerfNowGranularity(): number {
  let smallest = Infinity;
  let last = performance.now();
  const deadline = last + 50;
  let distinct = 0;
  while (distinct < 200) {
    const t = performance.now();
    if (t !== last) {
      smallest = Math.min(smallest, t - last);
      last = t;
      distinct++;
    }
    if (t > deadline) break;
  }
  return smallest;
}

const env: Record<string, unknown> = {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  isSecureContext: window.isSecureContext,
  crossOriginIsolated: window.crossOriginIsolated,
  devicePixelRatio: window.devicePixelRatio,
  perfNowGranularityMs: Number(measurePerfNowGranularity().toFixed(4)),
};

function renderEnv(): void {
  setText('env', JSON.stringify(env, null, 1));
}

interface UaDataLike {
  getHighEntropyValues?: (hints: string[]) => Promise<unknown>;
}
const uaData = (navigator as unknown as { userAgentData?: UaDataLike }).userAgentData;
uaData
  ?.getHighEntropyValues?.(['fullVersionList', 'platform', 'platformVersion', 'architecture'])
  .then((value) => {
    env.userAgentData = value;
    renderEnv();
  })
  .catch(() => undefined);

// ------------------------------------------------------- feature detection

// The event-driven gamepad proposals have used several names over the years and
// the current sources disagree with each other, so probe all of them.
const GAMEPAD_EVENT_NAMES = [
  'rawgamepadinputchange',
  'gamepadrawinputchange',
  'gamepadrawinputchanged',
  'gamepadinputchange',
  'gamepadchange',
  'gamepadbuttondown',
  'gamepadbuttonup',
  'gamepadaxismove',
];

const INTERFACE_NAMES = [
  'GamepadRawInputChangeEvent',
  'GamepadChangeEvent',
  'GamepadButtonEvent',
  'GamepadAxisMoveEvent',
  'GamepadEvent',
  'HID',
  'HIDDevice',
  'HIDInputReportEvent',
];

const hasGamepadApi = typeof navigator.getGamepads === 'function';

function detectFeatures(): Record<string, unknown> {
  const g = globalThis as unknown as Record<string, unknown>;
  const gamepadProto = (g.Gamepad as { prototype?: object } | undefined)?.prototype;
  const policy = (document as unknown as { featurePolicy?: { allowsFeature?: (name: string) => boolean } }).featurePolicy;
  const allows = (name: string): boolean | string => {
    try {
      return policy?.allowsFeature ? policy.allowsFeature(name) : 'unknown (no document.featurePolicy)';
    } catch {
      return 'unknown (threw)';
    }
  };
  const eventHandlersOnWindow = GAMEPAD_EVENT_NAMES.filter((n) => `on${n}` in window);
  const eventHandlersOnGamepad = gamepadProto ? GAMEPAD_EVENT_NAMES.filter((n) => `on${n}` in gamepadProto) : [];
  const interfaces = INTERFACE_NAMES.filter((n) => typeof g[n] !== 'undefined');
  const eventDriven =
    eventHandlersOnWindow.filter((n) => n !== 'gamepadconnected').length > 0 ||
    eventHandlersOnGamepad.length > 0 ||
    ['GamepadRawInputChangeEvent', 'GamepadChangeEvent', 'GamepadButtonEvent', 'GamepadAxisMoveEvent'].some((n) =>
      interfaces.includes(n),
    );
  return {
    gamepadPolling: hasGamepadApi,
    eventDrivenGamepadApi: eventDriven,
    eventHandlersOnWindow,
    eventHandlersOnGamepad,
    gamepadIsEventTarget: gamepadProto ? gamepadProto instanceof EventTarget : false,
    interfacesPresent: interfaces,
    interfacesMissing: INTERFACE_NAMES.filter((n) => !interfaces.includes(n)),
    webHid: 'hid' in navigator,
    permissionsPolicyGamepad: allows('gamepad'),
    permissionsPolicyHid: allows('hid'),
  };
}

const features = detectFeatures();

function renderFeatures(): void {
  const lines = [
    `Reading the pad by polling (navigator.getGamepads): ${features.gamepadPolling ? 'available' : 'NOT available'}`,
    `Event-driven gamepad API: ${features.eventDrivenGamepadApi ? 'something is exposed, see below' : 'nothing exposed in this browser as it is configured now'}`,
    `WebHID (navigator.hid): ${features.webHid ? 'available (no device requested yet)' : 'NOT available'}`,
    '',
    JSON.stringify(features, null, 1),
  ];
  setText('features', lines.join('\n'));
}

// ---------------------------------------------------------- reading pads

interface Snap {
  index: number;
  id: string;
  mapping: string;
  timestamp: number;
  pressed: boolean[];
  values: number[];
  axes: number[];
}

function snapOf(p: Gamepad): Snap {
  return {
    index: p.index,
    id: p.id,
    mapping: p.mapping,
    timestamp: p.timestamp,
    pressed: p.buttons.map((b) => b.pressed),
    values: p.buttons.map((b) => b.value),
    axes: [...p.axes],
  };
}

function readPads(): Snap[] {
  if (!hasGamepadApi) return [];
  const out: Snap[] = [];
  for (const p of navigator.getGamepads()) {
    if (p) out.push(snapOf(p));
  }
  return out;
}

// A "signature" is what differs from the resting state. Directions may arrive
// as buttons, as stick axes, as one hat axis with a value per direction, or as
// keyboard keys, so nothing here assumes a layout.
const AXIS_EPS = 0.1;

interface Sig {
  buttons: { pad: number; index: number; pressed: boolean; value: number }[];
  axes: { pad: number; index: number; value: number; rest: number }[];
  keys: string[];
}

function sigOf(pads: Snap[], base: Map<number, Snap>, keys: Iterable<string>): Sig {
  const sig: Sig = { buttons: [], axes: [], keys: [...keys].sort() };
  for (const p of pads) {
    const rest = base.get(p.index);
    if (!rest) continue;
    for (let i = 0; i < p.pressed.length; i++) {
      if (p.pressed[i] !== (rest.pressed[i] ?? false)) {
        sig.buttons.push({ pad: p.index, index: i, pressed: p.pressed[i], value: p.values[i] });
      }
    }
    for (let i = 0; i < p.axes.length; i++) {
      const restValue = rest.axes[i] ?? 0;
      if (Math.abs(p.axes[i] - restValue) > AXIS_EPS) {
        sig.axes.push({ pad: p.index, index: i, value: p.axes[i], rest: restValue });
      }
    }
  }
  return sig;
}

function sigKey(s: Sig): string {
  return [
    ...s.buttons.map((b) => `p${b.pad}b${b.index}${b.pressed ? '+' : '-'}`),
    ...s.axes.map((a) => `p${a.pad}a${a.index}=${(Math.round(a.value * 10) / 10).toFixed(1)}`),
    ...s.keys.map((k) => `k${k}`),
  ].join(' ');
}

function fmtSig(s: Sig): string {
  const parts = [
    ...s.buttons.map((b) => `pad${b.pad} button ${b.index}${b.pressed ? '' : ' (released)'}`),
    ...s.axes.map((a) => `pad${a.pad} axis ${a.index} = ${f3(a.value)} (rest ${f3(a.rest)})`),
    ...s.keys.map((k) => `key ${k}`),
  ];
  return parts.length ? parts.join(' + ') : '(nothing: same as rest)';
}

function baselineNow(): Map<number, Snap> {
  return new Map(readPads().map((p) => [p.index, p]));
}

const NO_KEYS: string[] = [];
function padsActive(pads: Snap[], base: Map<number, Snap>): boolean {
  const sig = sigOf(pads, base, NO_KEYS);
  return sig.buttons.length + sig.axes.length > 0;
}

// ---------------------------------------------------------------- keyboard

const heldKeys = new Set<string>();
const kbd = { downs: 0, ups: 0, repeats: 0, latency: [] as number[], log: [] as string[] };

function shouldSwallowKey(e: KeyboardEvent): boolean {
  if (!el<HTMLInputElement>('kbd-capture').checked) return false;
  if (e.ctrlKey || e.altKey || e.metaKey) return false;
  if (/^F\d+$/.test(e.code)) return false;
  const target = e.target as HTMLElement | null;
  return !(target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT'));
}

window.addEventListener('keydown', (e) => {
  const now = performance.now();
  if (shouldSwallowKey(e)) e.preventDefault();
  if (e.repeat) {
    kbd.repeats++;
    return;
  }
  kbd.downs++;
  heldKeys.add(e.code);
  push(kbd.latency, now - e.timeStamp);
  pushLine(kbd.log, `down ${e.code} key="${e.key}" t=${f1(e.timeStamp)} handler +${f3(now - e.timeStamp)} ms`, 20);
  if (tap.running) tap.sources.kbd.feed(true, e.timeStamp);
});

window.addEventListener('keyup', (e) => {
  const now = performance.now();
  if (shouldSwallowKey(e)) e.preventDefault();
  kbd.ups++;
  heldKeys.delete(e.code);
  push(kbd.latency, now - e.timeStamp);
  pushLine(kbd.log, `up   ${e.code} key="${e.key}" t=${f1(e.timeStamp)} handler +${f3(now - e.timeStamp)} ms`, 20);
  if (tap.running && heldKeys.size === 0) tap.sources.kbd.feed(false, e.timeStamp);
});

window.addEventListener('blur', () => heldKeys.clear());

function renderKbd(): void {
  const lines = [
    `keydown: ${kbd.downs} (auto-repeats ignored: ${kbd.repeats})   keyup: ${kbd.ups}   held now: ${[...heldKeys].join(' ') || 'none'}`,
    `delay from event timestamp to handler: ${fmtStats(stats(kbd.latency))}`,
    'last events:',
    ...kbd.log.map((l) => `  ${l}`),
  ];
  setText('kbd', lines.join('\n'));
}

// ---------------------------------------------------------------- mapping

const HOLD_MS = 60; // an input must stay unchanged this long to be recorded
const COUNTDOWN_MS = 3000;
const RELEASE_SETTLE_MS = 1000;

interface Step {
  id: string;
  prompt: string;
  kind: 'hold' | 'extras' | 'countdown';
}

const STEPS: Step[] = [
  { id: 'up', prompt: 'Press and hold UP', kind: 'hold' },
  { id: 'down', prompt: 'Press and hold DOWN', kind: 'hold' },
  { id: 'left', prompt: 'Press and hold LEFT', kind: 'hold' },
  { id: 'right', prompt: 'Press and hold RIGHT', kind: 'hold' },
  { id: 'LP', prompt: 'Press and hold the button you use for LIGHT PUNCH', kind: 'hold' },
  { id: 'MP', prompt: 'Press and hold the button you use for MEDIUM PUNCH', kind: 'hold' },
  { id: 'HP', prompt: 'Press and hold the button you use for HEAVY PUNCH', kind: 'hold' },
  { id: 'LK', prompt: 'Press and hold the button you use for LIGHT KICK', kind: 'hold' },
  { id: 'MK', prompt: 'Press and hold the button you use for MEDIUM KICK', kind: 'hold' },
  { id: 'HK', prompt: 'Press and hold the button you use for HEAVY KICK', kind: 'hold' },
  {
    id: 'extra',
    prompt:
      'Press every OTHER button on the controller, one at a time (shortcut buttons, Start, Select, Home, L3, R3, touchpad...). Click "Done with extra buttons" when none are left',
    kind: 'extras',
  },
  { id: 'down + right together', prompt: 'Hold DOWN and RIGHT together and keep holding', kind: 'countdown' },
  {
    id: 'left, then right added',
    prompt: 'Hold LEFT. Keep holding it and also press RIGHT. Keep both held',
    kind: 'countdown',
  },
  {
    id: 'down, then up added',
    prompt: 'Hold DOWN. Keep holding it and also press UP. Keep both held',
    kind: 'countdown',
  },
];

interface WizResult {
  step: string;
  skipped?: true;
  sig?: Sig;
  states?: { tMs: number; sig: Sig }[];
}

type WizPhase = 'idle' | 'press' | 'release' | 'countdown' | 'finished';

const wiz = {
  phase: 'idle' as WizPhase,
  step: 0,
  base: new Map<number, Snap>(),
  candKey: '',
  candSince: 0,
  extras: 0,
  cdStart: 0,
  cdStates: [] as { tMs: number; sig: Sig }[],
  cdLastKey: '',
  restSince: NaN,
  note: '',
  results: [] as WizResult[],
};

function wizStart(): void {
  wiz.phase = 'press';
  wiz.step = 0;
  wiz.base = baselineNow();
  wiz.candKey = '';
  wiz.extras = 0;
  wiz.results = [];
  heldKeys.clear();
  wiz.note =
    wiz.base.size === 0
      ? 'No gamepad was visible when mapping started, so only keyboard keys can be recorded. If the controller is in a gamepad mode, press a button on it until it shows up in the list above, let go, and start again.'
      : '';
}

function wizNextStep(): void {
  wiz.step++;
  wiz.candKey = '';
  wiz.phase = wiz.step >= STEPS.length ? 'finished' : 'press';
}

function wizSkip(): void {
  if (wiz.phase === 'idle' || wiz.phase === 'finished') return;
  const step = STEPS[wiz.step];
  // During "let go of everything" the step is already recorded: Skip just moves on,
  // so a pad that never returns exactly to rest cannot trap the owner.
  if (wiz.phase !== 'release' && step.kind !== 'extras') wiz.results.push({ step: step.id, skipped: true });
  wizNextStep();
}

function wizSample(pads: Snap[], now: number): void {
  if (wiz.phase === 'idle' || wiz.phase === 'finished') return;
  const step = STEPS[wiz.step];
  const sig = sigOf(pads, wiz.base, heldKeys);
  const key = sigKey(sig);

  if (wiz.phase === 'release') {
    if (key !== '') {
      wiz.restSince = NaN;
      return;
    }
    if (Number.isNaN(wiz.restSince)) wiz.restSince = now;
    // Two opposite directions held together can cancel out to the resting value, so "looks
    // like rest" does not prove "let go". After a two-direction step, rest has to last.
    if (step.kind === 'countdown' && now - wiz.restSince < RELEASE_SETTLE_MS) return;
    if (step.kind === 'extras') {
      wiz.phase = 'press';
      wiz.candKey = '';
    } else {
      wizNextStep();
    }
    return;
  }

  if (wiz.phase === 'press') {
    if (key === '') {
      wiz.candKey = '';
      return;
    }
    if (step.kind === 'countdown') {
      wiz.phase = 'countdown';
      wiz.cdStart = now;
      wiz.cdStates = [{ tMs: 0, sig }];
      wiz.cdLastKey = key;
      return;
    }
    if (key !== wiz.candKey) {
      wiz.candKey = key;
      wiz.candSince = now;
      return;
    }
    if (now - wiz.candSince >= HOLD_MS) {
      const name = step.kind === 'extras' ? `extra ${++wiz.extras}` : step.id;
      wiz.results.push({ step: name, sig });
      wiz.phase = 'release';
      wiz.restSince = NaN;
    }
    return;
  }

  // countdown: log every distinct state seen, in order, then keep the last one.
  if (key !== wiz.cdLastKey) {
    wiz.cdStates.push({ tMs: now - wiz.cdStart, sig });
    wiz.cdLastKey = key;
  }
  if (now - wiz.cdStart >= COUNTDOWN_MS) {
    wiz.results.push({ step: step.id, sig, states: wiz.cdStates });
    wiz.phase = 'release';
    wiz.restSince = NaN;
  }
}

function wizPrompt(now: number): string {
  switch (wiz.phase) {
    case 'idle':
      return 'Not started.';
    case 'finished':
      return 'Mapping finished. Press things again and check the "named inputs held" line above.';
    case 'release':
      return STEPS[wiz.step].kind === 'countdown'
        ? 'Recorded. Let go of everything and wait a second.'
        : 'Recorded. Let go of everything.';
    case 'countdown':
      return `${STEPS[wiz.step].prompt}. Recording: ${Math.ceil((COUNTDOWN_MS - (now - wiz.cdStart)) / 1000)} s left.`;
    case 'press': {
      const extras = STEPS[wiz.step].kind === 'extras' ? ` (${wiz.extras} recorded so far)` : '';
      return `Step ${wiz.step + 1} of ${STEPS.length}: ${STEPS[wiz.step].prompt}.${extras}`;
    }
  }
}

function fmtWizResult(r: WizResult): string {
  if (r.skipped || !r.sig) return `${r.step}: skipped`;
  if (r.states) {
    const seq = r.states.map((s) => `at ${f1(s.tMs)} ms ${fmtSig(s.sig)}`).join('  ->  ');
    return `${r.step}: ${seq}  |  still held at the end: ${fmtSig(r.sig)}`;
  }
  return `${r.step}: ${fmtSig(r.sig)}`;
}

function wizRestLines(): string[] {
  return [...wiz.base.values()].map((p) => `pad${p.index} at rest: axes [${p.axes.map(f3).join(', ')}]`);
}

function renderWiz(): void {
  const lines = [wiz.note, ...wizRestLines(), ...wiz.results.map(fmtWizResult)].filter((l) => l !== '');
  setText('wiz-out', lines.join('\n'));
  const running = wiz.phase !== 'idle' && wiz.phase !== 'finished';
  el<HTMLButtonElement>('wiz-skip').disabled = !running;
  el<HTMLButtonElement>('wiz-done').disabled = !(running && STEPS[wiz.step]?.kind === 'extras');
}

// Which recorded single inputs are held right now. Lets the owner check the mapping.
function namedHeld(pads: Snap[]): string[] {
  const byIndex = new Map(pads.map((p) => [p.index, p]));
  const out: string[] = [];
  for (const r of wiz.results) {
    const sig = r.sig;
    if (!sig || r.states) continue;
    if (sig.buttons.length + sig.axes.length + sig.keys.length === 0) continue;
    const held =
      sig.buttons.every((b) => byIndex.get(b.pad)?.pressed[b.index] === b.pressed) &&
      sig.axes.every((a) => {
        const v = byIndex.get(a.pad)?.axes[a.index];
        return v !== undefined && Math.abs(v - a.value) <= AXIS_EPS;
      }) &&
      sig.keys.every((k) => heldKeys.has(k));
    if (held) out.push(r.step);
  }
  return out;
}

// ----------------------------------------------------------------- timing

interface GapSet {
  raf: number[]; // gap between the timestamps the browser hands to requestAnimationFrame
  cb: number[]; // gap between the moments our callback actually started (when the pad is read)
}

const fast = { on: false, polls: 0, lastPoll: 0, ratePolls: 0, rateAt: performance.now(), rate: 0 };
const gapSets: Record<'fastOff' | 'fastOn', GapSet> = {
  fastOff: { raf: [], cb: [] },
  fastOn: { raf: [], cb: [] },
};
const frameClock = { lastRaf: NaN, lastCb: NaN, skipNext: true, hiddenCount: 0 };

document.addEventListener('visibilitychange', () => {
  frameClock.skipNext = true;
  if (document.visibilityState === 'hidden') frameClock.hiddenCount++;
});

function trackFrame(rafTime: number, now: number): void {
  if (!frameClock.skipNext && !Number.isNaN(frameClock.lastRaf)) {
    const set = gapSets[fast.on ? 'fastOn' : 'fastOff'];
    push(set.raf, rafTime - frameClock.lastRaf);
    push(set.cb, now - frameClock.lastCb);
  }
  frameClock.skipNext = false;
  frameClock.lastRaf = rafTime;
  frameClock.lastCb = now;
}

// Gamepad.timestamp: the browser's own claim of when the pad's data last changed.
interface PadClock {
  rafLast: number;
  fastLast: number;
  rafGaps: number[];
  fastGaps: number[];
  rafAge: number[];
  fastAge: number[];
}
const padClocks = new Map<number, PadClock>();

function trackTimestamps(pads: Snap[], now: number, loop: 'raf' | 'fast'): void {
  for (const p of pads) {
    let c = padClocks.get(p.index);
    if (!c) {
      c = { rafLast: NaN, fastLast: NaN, rafGaps: [], fastGaps: [], rafAge: [], fastAge: [] };
      padClocks.set(p.index, c);
    }
    const last = loop === 'raf' ? c.rafLast : c.fastLast;
    if (p.timestamp === last) continue;
    if (!Number.isNaN(last)) {
      push(loop === 'raf' ? c.rafGaps : c.fastGaps, p.timestamp - last);
      push(loop === 'raf' ? c.rafAge : c.fastAge, now - p.timestamp);
    }
    if (loop === 'raf') c.rafLast = p.timestamp;
    else c.fastLast = p.timestamp;
  }
}

function resetTiming(): void {
  for (const set of Object.values(gapSets)) {
    set.raf.length = 0;
    set.cb.length = 0;
  }
  for (const c of padClocks.values()) {
    c.rafGaps.length = 0;
    c.fastGaps.length = 0;
    c.rafAge.length = 0;
    c.fastAge.length = 0;
  }
  frameClock.skipNext = true;
  frameClock.hiddenCount = 0;
}

function longFrames(gaps: number[]): string {
  const s = stats(gaps);
  if (!s) return 'n/a';
  const long = gaps.filter((g) => g > s.median * 1.5).length;
  return `${long} of ${s.n} (${((100 * long) / s.n).toFixed(2)}%)`;
}

function gapSetLines(label: string, set: GapSet): string[] {
  const s = stats(set.raf);
  if (!s) return [`${label}: no frames yet`];
  return [
    `${label}: about ${(1000 / s.median).toFixed(2)} samples per second`,
    `  gap between frame timestamps:     ${fmtStats(s)}`,
    `  gap between actual reads:         ${fmtStats(stats(set.cb))}`,
    `  frames longer than 1.5x median:   ${longFrames(set.raf)}`,
    `  last 20 gaps between reads (ms):  ${nums(set.cb, 1, 20)}`,
  ];
}

function renderTiming(now: number): void {
  if (now - fast.rateAt >= 1000) {
    fast.rate = ((fast.polls - fast.ratePolls) * 1000) / (now - fast.rateAt);
    fast.ratePolls = fast.polls;
    fast.rateAt = now;
  }
  const lines = [
    `tab visible: ${document.visibilityState === 'visible'}   window focused: ${document.hasFocus()}   times hidden since reset: ${frameClock.hiddenCount}`,
    `smallest step of the page clock (performance.now): ${f3(env.perfNowGranularityMs as number)} ms`,
    '',
    'Reading the pad once per display frame (requestAnimationFrame):',
    ...gapSetLines('fast poll off', gapSets.fastOff),
    ...gapSetLines('fast poll on ', gapSets.fastOn),
    '',
    `Fast poll: ${fast.on ? `on, ${fast.rate.toFixed(0)} reads per second` : 'off'}`,
    '',
    'Gamepad.timestamp (when the browser says the pad last changed). It only moves when something changes:',
  ];
  if (padClocks.size === 0) lines.push('  no pad seen yet');
  for (const [index, c] of padClocks) {
    lines.push(
      `  pad ${index}:`,
      `    gap between changes, seen by frame reads: ${fmtStats(stats(c.rafGaps))}`,
      `    age of a change when a frame read saw it: ${fmtStats(stats(c.rafAge))}`,
      `    gap between changes, seen by fast poll:   ${fmtStats(stats(c.fastGaps))}`,
      `    age of a change when fast poll saw it:    ${fmtStats(stats(c.fastAge))}`,
    );
  }
  setText('timing', lines.join('\n'));
}

// --------------------------------------------------------------- tap test

const CALIBRATE_MS = 700;

class TapSource {
  active = false;
  holds: number[] = [];
  gaps: number[] = [];
  samplesHeld: number[] = [];
  private downAt = 0;
  private lastUpAt = NaN;
  private held = 0;

  constructor(readonly label: string) {}

  reset(): void {
    this.active = false;
    this.holds = [];
    this.gaps = [];
    this.samplesHeld = [];
    this.lastUpAt = NaN;
    this.held = 0;
  }

  feed(active: boolean, time: number): void {
    if (active) {
      if (!this.active) {
        this.active = true;
        this.downAt = time;
        this.held = 0;
        if (!Number.isNaN(this.lastUpAt)) this.gaps.push(time - this.lastUpAt);
      }
      this.held++;
    } else if (this.active) {
      this.active = false;
      this.holds.push(time - this.downAt);
      this.samplesHeld.push(this.held);
      this.lastUpAt = time;
    }
  }
}

const tap = {
  running: false,
  startedAt: 0,
  stoppedAt: 0,
  calibUntil: 0,
  armed: false,
  base: new Map<number, Snap>(),
  eventPads: new Set<number>(),
  fastWasOn: false,
  sources: {
    raf: new TapSource('Frame reads, timed by when the read happened'),
    rafTs: new TapSource('Frame reads, timed by Gamepad.timestamp'),
    fast: new TapSource('Fast poll, timed by when the read happened'),
    event: new TapSource('Gamepad events, timed by the event timestamp'),
    kbd: new TapSource('Keyboard events, timed by the event timestamp'),
    hid: new TapSource('WebHID input reports, timed by the event timestamp'),
  },
};

function tapStart(): void {
  for (const s of Object.values(tap.sources)) s.reset();
  tap.base = baselineNow();
  tap.eventPads.clear();
  tap.fastWasOn = fast.on;
  heldKeys.clear();
  for (const d of hidDevs) {
    d.tapBase = new Map([...d.last].map(([id, bytes]) => [id, bytes.slice()]));
    d.tapMask = new Map([...d.last].map(([id, bytes]) => [id, new Uint8Array(bytes.length)]));
    d.tapActive.clear();
    d.tapNoBase = false;
  }
  tap.startedAt = performance.now();
  tap.calibUntil = tap.startedAt + CALIBRATE_MS;
  tap.armed = false;
  tap.running = true;
}

function tapStop(): void {
  if (!tap.running) return;
  tap.running = false;
  tap.stoppedAt = performance.now();
}

function tapSampleFrame(pads: Snap[], now: number): void {
  if (tap.base.size === 0) return;
  const active = padsActive(pads, tap.base);
  if (!tap.armed) {
    // A press already under way when the hands-off window ends would be measured cut short,
    // and differently by each row. Start counting from the first moment the pad is at rest.
    if (active) return;
    tap.armed = true;
  }
  tap.sources.raf.feed(active, now);
  const known = pads.filter((p) => tap.base.has(p.index));
  if (known.length > 0) tap.sources.rafTs.feed(active, Math.max(...known.map((p) => p.timestamp)));
}

function tapSourceNote(key: keyof typeof tap.sources): string {
  switch (key) {
    case 'raf':
    case 'rafTs':
      return tap.base.size === 0 ? 'no gamepad was visible when the test started' : '';
    case 'fast':
      return tap.fastWasOn ? '' : 'fast poll was off when the test started';
    case 'event':
      return Object.keys(gamepadEvents).length === 0 ? 'this browser has sent no gamepad input events' : '';
    case 'kbd':
      return '';
    case 'hid':
      if (hidDevs.length === 0) return 'no HID device opened';
      if (hidDevs.some((d) => d.tapNoBase))
        return 'a report arrived with no known resting report: press and release a button, then start the test again';
      return `ignoring ${hidDevs.reduce((n, d) => n + [...d.tapMask.values()].reduce((m, mask) => m + mask.reduce((a, b) => a + b, 0), 0), 0)} report bytes that change on their own`;
  }
}

function tapSourceLines(key: keyof typeof tap.sources): string[] {
  const s = tap.sources[key];
  const note = tapSourceNote(key);
  const h = stats(s.holds);
  const lines = [`${s.label}${note ? `  [${note}]` : ''}`];
  if (!h) {
    lines.push('  taps: 0');
    return lines;
  }
  const g = stats(s.gaps);
  lines.push(
    `  taps: ${h.n}   hold ms min/median/max: ${f1(h.min)} / ${f1(h.median)} / ${f1(h.max)}   between taps ms min/median: ${g ? `${f1(g.min)} / ${f1(g.median)}` : 'n/a'}`,
    `  each hold (ms): ${nums(s.holds)}`,
  );
  if (key === 'raf') lines.push(`  each hold (frames it was seen held): ${nums(s.samplesHeld, 0)}`);
  if (key === 'fast') lines.push(`  each hold (reads it was seen held): ${nums(s.samplesHeld, 0)}`);
  return lines;
}

const TAP_KEYS = Object.keys(tap.sources) as (keyof typeof tap.sources)[];

// Shown every frame, so WAIT and GO appear the moment they become true.
function tapHead(now: number): string {
  if (tap.running) {
    if (now < tap.calibUntil) return 'WAIT: hands off the controller...';
    if (tap.base.size > 0 && !tap.armed) return 'WAIT: let go of everything...';
    return `GO: tap one button 20 times, as short as you can, then click Stop. (${f1((now - tap.startedAt) / 1000)} s)`;
  }
  if (tap.startedAt) {
    return `Stopped after ${f1((tap.stoppedAt - tap.startedAt) / 1000)} s. A row with fewer taps than you made missed some.`;
  }
  return 'Not started.';
}

function renderTap(): void {
  setText('tap', TAP_KEYS.flatMap(tapSourceLines).join('\n'));
}

// -------------------------------------------------------------- fast poll

const fastChannel = new MessageChannel();
fastChannel.port1.onmessage = () => {
  if (!fast.on) return;
  const now = performance.now();
  if (now - fast.lastPoll >= 0.5) {
    fast.lastPoll = now;
    fast.polls++;
    const pads = readPads();
    trackTimestamps(pads, now, 'fast');
    if (tap.running && tap.armed && tap.base.size > 0) {
      tap.sources.fast.feed(padsActive(pads, tap.base), now);
    }
  }
  fastChannel.port2.postMessage(0);
};

function setFast(on: boolean): void {
  fast.on = on;
  frameClock.skipNext = true;
  fast.ratePolls = fast.polls;
  fast.rateAt = performance.now();
  if (on) fastChannel.port2.postMessage(0);
}

// --------------------------------------------------------- gamepad events

interface EventRecord {
  count: number;
  lastTs: number;
  intervals: number[];
  latency: number[];
  hasGamepad: boolean;
  props: string;
}
const gamepadEvents: Record<string, EventRecord> = {};
const padLog: string[] = [];

function onGamepadInputEvent(e: Event): void {
  const now = performance.now();
  const pad = (e as unknown as { gamepad?: Gamepad }).gamepad;
  let rec = gamepadEvents[e.type];
  if (!rec) {
    const props: string[] = [];
    for (const k in e) if (!(k in Event.prototype)) props.push(k);
    rec = { count: 0, lastTs: NaN, intervals: [], latency: [], hasGamepad: Boolean(pad), props: props.join(', ') };
    gamepadEvents[e.type] = rec;
  }
  rec.count++;
  if (!Number.isNaN(rec.lastTs)) push(rec.intervals, e.timeStamp - rec.lastTs);
  rec.lastTs = e.timeStamp;
  push(rec.latency, now - e.timeStamp);
  if (pad && tap.running && tap.armed) {
    const snap = snapOf(pad);
    if (!tap.base.has(snap.index)) return;
    if (padsActive([snap], tap.base)) tap.eventPads.add(snap.index);
    else tap.eventPads.delete(snap.index);
    tap.sources.event.feed(tap.eventPads.size > 0, e.timeStamp);
  }
}

for (const name of GAMEPAD_EVENT_NAMES) window.addEventListener(name, onGamepadInputEvent);

window.addEventListener('gamepadconnected', (e) => {
  const pad = (e as GamepadEvent).gamepad;
  pushLine(padLog, `t=${f1(e.timeStamp)} connected pad ${pad.index}: ${pad.id}`, 12);
  // One draft of the proposal fires input events on the Gamepad object itself.
  const target = pad as unknown as Partial<EventTarget>;
  if (typeof target.addEventListener === 'function') {
    for (const name of GAMEPAD_EVENT_NAMES) target.addEventListener(name, onGamepadInputEvent);
  }
});

window.addEventListener('gamepaddisconnected', (e) => {
  const pad = (e as GamepadEvent).gamepad;
  pushLine(padLog, `t=${f1(e.timeStamp)} disconnected pad ${pad.index}: ${pad.id}`, 12);
});

function renderEvents(): void {
  const names = Object.keys(gamepadEvents);
  const lines =
    names.length === 0
      ? ['No gamepad input events received. Listening for: ' + GAMEPAD_EVENT_NAMES.join(', ')]
      : names.flatMap((n) => {
          const r = gamepadEvents[n];
          return [
            `${n}: ${r.count} events, carries a gamepad snapshot: ${r.hasGamepad}, properties: ${r.props || '(none)'}`,
            `  gap between events:                    ${fmtStats(stats(r.intervals))}`,
            `  delay from event timestamp to handler: ${fmtStats(stats(r.latency))}`,
          ];
        });
  setText('events', lines.join('\n'));
}

// ----------------------------------------------------------------- WebHID

interface HidCollectionLike {
  usagePage?: number;
  usage?: number;
  inputReports?: { reportId?: number }[];
}
interface HidDeviceLike extends EventTarget {
  opened: boolean;
  vendorId: number;
  productId: number;
  productName: string;
  collections: HidCollectionLike[];
  open(): Promise<void>;
}
interface HidReportEventLike extends Event {
  reportId: number;
  data: DataView;
}
interface HidLike {
  requestDevice(options: { filters: object[] }): Promise<HidDeviceLike[]>;
}

interface HidDev {
  name: string;
  ids: string;
  collections: string[];
  error: string;
  reports: number;
  lastTs: number;
  intervals: number[];
  last: Map<number, Uint8Array>;
  changeCount: number;
  lastChangeTs: number;
  changeIntervals: number[];
  changes: string[];
  tapBase: Map<number, Uint8Array>;
  tapMask: Map<number, Uint8Array>;
  tapActive: Set<number>;
  tapNoBase: boolean;
}

const hidDevs: HidDev[] = [];
let hidStatus = 'hid' in navigator ? 'No device requested yet.' : 'WebHID is not available in this browser.';

const hex = (n: number, width: number): string => n.toString(16).padStart(width, '0');
const hexBytes = (bytes: Uint8Array): string => [...bytes].map((b) => hex(b, 2)).join(' ');

function hidTapFeed(d: HidDev, id: number, bytes: Uint8Array, ts: number): void {
  const base = d.tapBase.get(id);
  const calibrating = ts < tap.calibUntil;
  if (!base) {
    if (calibrating) {
      d.tapBase.set(id, bytes.slice());
      d.tapMask.set(id, new Uint8Array(bytes.length));
    } else {
      d.tapNoBase = true;
    }
    return;
  }
  const mask = d.tapMask.get(id) ?? new Uint8Array(base.length);
  const n = Math.min(bytes.length, base.length);
  if (calibrating) {
    // Bytes that move while the hands are off (counters, clocks, sensors) are not buttons.
    for (let i = 0; i < n; i++) if (bytes[i] !== base[i]) mask[i] = 1;
    return;
  }
  let differs = false;
  for (let i = 0; i < n; i++) {
    if (!mask[i] && bytes[i] !== base[i]) {
      differs = true;
      break;
    }
  }
  if (differs) d.tapActive.add(id);
  else d.tapActive.delete(id);
  tap.sources.hid.feed(hidDevs.some((x) => x.tapActive.size > 0), ts);
}

function onHidReport(d: HidDev, e: HidReportEventLike): void {
  const ts = e.timeStamp;
  const bytes = new Uint8Array(e.data.buffer.slice(e.data.byteOffset, e.data.byteOffset + e.data.byteLength));
  d.reports++;
  if (!Number.isNaN(d.lastTs)) push(d.intervals, ts - d.lastTs);
  d.lastTs = ts;
  const prev = d.last.get(e.reportId);
  if (prev) {
    // Once a tap test has learned which bytes move on their own, leave them out of the log.
    const mask = d.tapMask.get(e.reportId);
    const changed: number[] = [];
    for (let i = 0; i < Math.max(prev.length, bytes.length); i++) {
      if (prev[i] !== bytes[i] && !mask?.[i]) changed.push(i);
    }
    if (changed.length > 0) {
      d.changeCount++;
      const dt = Number.isNaN(d.lastChangeTs) ? NaN : ts - d.lastChangeTs;
      if (!Number.isNaN(dt)) push(d.changeIntervals, dt);
      d.lastChangeTs = ts;
      pushLine(
        d.changes,
        `t=${f1(ts)} +${Number.isNaN(dt) ? '?' : f1(dt)} ms report ${e.reportId} bytes changed [${changed.join(',')}]: ${hexBytes(bytes)}`,
        20,
      );
    }
  }
  d.last.set(e.reportId, bytes);
  if (tap.running) hidTapFeed(d, e.reportId, bytes, ts);
}

async function requestHid(): Promise<void> {
  const hid = (navigator as unknown as { hid?: HidLike }).hid;
  if (!hid) return;
  let chosen: HidDeviceLike[];
  try {
    chosen = await hid.requestDevice({ filters: [] });
  } catch (err) {
    hidStatus = `requestDevice failed: ${String(err)}`;
    return;
  }
  if (chosen.length === 0) {
    hidStatus = 'Nothing chosen. Either the chooser was cancelled or the controller was not in the list.';
    return;
  }
  hidStatus = `${chosen.length} HID interface(s) chosen.`;
  for (const device of chosen) {
    const d: HidDev = {
      name: device.productName,
      ids: `vendor 0x${hex(device.vendorId, 4)} product 0x${hex(device.productId, 4)}`,
      collections: device.collections.map(
        (c) =>
          `usagePage 0x${hex(c.usagePage ?? 0, 4)} usage 0x${hex(c.usage ?? 0, 4)} inputReportIds [${(c.inputReports ?? []).map((r) => r.reportId).join(',')}]`,
      ),
      error: '',
      reports: 0,
      lastTs: NaN,
      intervals: [],
      last: new Map(),
      changeCount: 0,
      lastChangeTs: NaN,
      changeIntervals: [],
      changes: [],
      tapBase: new Map(),
      tapMask: new Map(),
      tapActive: new Set(),
      tapNoBase: false,
    };
    hidDevs.push(d);
    device.addEventListener('inputreport', (e) => onHidReport(d, e as HidReportEventLike));
    try {
      if (!device.opened) await device.open();
    } catch (err) {
      d.error = `open failed: ${String(err)}`;
    }
  }
}

function hidDevLines(d: HidDev): string[] {
  const s = stats(d.intervals);
  return [
    `${d.name || '(unnamed)'}  ${d.ids}${d.error ? `  ERROR: ${d.error}` : ''}`,
    ...d.collections.map((c) => `  collection: ${c}`),
    `  input reports received: ${d.reports}${s ? `, about ${(1000 / s.median).toFixed(0)} per second while they are flowing` : ''}`,
    `  gap between reports:                 ${fmtStats(s)}`,
    `  reports whose content changed (after a tap test: not counting bytes that move on their own): ${d.changeCount}`,
    `  gap between changed reports:         ${fmtStats(stats(d.changeIntervals))}`,
    `  last report per id: ${[...d.last].map(([id, bytes]) => `[${id}] ${hexBytes(bytes)}`).join('  ') || 'none yet'}`,
    '  last changed reports:',
    ...d.changes.map((c) => `    ${c}`),
  ];
}

function renderHid(): void {
  setText('hid', [hidStatus, ...hidDevs.flatMap(hidDevLines)].join('\n'));
}

// ------------------------------------------------------------ live render

function renderPads(pads: Snap[]): void {
  if (!hasGamepadApi) {
    setText('pads', 'navigator.getGamepads is not available in this browser or context.');
    return;
  }
  if (pads.length === 0) {
    setText('pads', 'No gamepad visible yet.');
    return;
  }
  const lines: string[] = [];
  for (const p of pads) {
    const pressed = p.pressed.flatMap((on, i) => (on ? [i] : []));
    const analog = p.values.flatMap((v, i) => (v !== 0 && v !== 1 ? [`${i}=${v.toFixed(2)}`] : []));
    lines.push(
      `pad ${p.index}: ${p.id}`,
      `  mapping="${p.mapping || '(none)'}"  buttons=${p.pressed.length}  axes=${p.axes.length}  timestamp=${f1(p.timestamp)}`,
      `  buttons: ${p.pressed.map((on, i) => (on ? `[${i}]` : ` ${i} `)).join('')}`,
      `  pressed now: ${pressed.length ? pressed.join(', ') : 'none'}${analog.length ? `   part-pressed values: ${analog.join(' ')}` : ''}`,
      `  axes: ${p.axes.map((v, i) => `${i}:${v >= 0 ? '+' : ''}${f3(v)}`).join('  ')}`,
    );
  }
  if (wiz.results.length > 0) lines.push(`named inputs held (from the mapping below): ${namedHeld(pads).join(', ') || 'none'}`);
  setText('pads', lines.join('\n'));
}

// ----------------------------------------------------------------- report

function gapSetReport(set: GapSet): Record<string, unknown> {
  return {
    frameTimestampGapMs: stats(set.raf),
    readGapMs: stats(set.cb),
    longFrames: longFrames(set.raf),
    readGapHistogram: histogram(set.cb),
  };
}

function buildReport(): string {
  const report = {
    spike: 'buffered-phase0',
    generatedAt: new Date().toISOString(),
    env,
    visibility: { visible: document.visibilityState === 'visible', focused: document.hasFocus(), hiddenCount: frameClock.hiddenCount },
    features,
    pads: readPads().map((p) => ({
      index: p.index,
      id: p.id,
      mapping: p.mapping,
      buttons: p.pressed.length,
      axes: p.axes.length,
      axesNow: p.axes.map(f3).join(' '),
    })),
    padLog,
    mapping: { note: wiz.note, phase: wiz.phase, rest: wizRestLines(), results: wiz.results.map(fmtWizResult) },
    timing: {
      framesFastPollOff: gapSetReport(gapSets.fastOff),
      framesFastPollOn: gapSetReport(gapSets.fastOn),
      fastPoll: { on: fast.on, readsPerSecond: Math.round(fast.rate), totalReads: fast.polls },
      padTimestamps: [...padClocks].map(([index, c]) => ({
        pad: index,
        gapSeenByFrameReads: stats(c.rafGaps),
        ageWhenFrameReadSawIt: stats(c.rafAge),
        gapSeenByFastPoll: stats(c.fastGaps),
        ageWhenFastPollSawIt: stats(c.fastAge),
      })),
    },
    tapTest: {
      running: tap.running,
      seconds: tap.startedAt ? Number((((tap.running ? performance.now() : tap.stoppedAt) - tap.startedAt) / 1000).toFixed(1)) : 0,
      sources: TAP_KEYS.map((key) => {
        const s = tap.sources[key];
        return {
          source: s.label,
          note: tapSourceNote(key),
          taps: s.holds.length,
          holdMs: nums(s.holds),
          samplesHeld: nums(s.samplesHeld, 0),
          betweenTapsMs: nums(s.gaps),
        };
      }),
    },
    gamepadEvents: Object.entries(gamepadEvents).map(([name, r]) => ({
      name,
      count: r.count,
      carriesGamepad: r.hasGamepad,
      properties: r.props,
      gapMs: stats(r.intervals),
      handlerDelayMs: stats(r.latency),
    })),
    keyboard: { keydown: kbd.downs, keyup: kbd.ups, repeatsIgnored: kbd.repeats, handlerDelayMs: stats(kbd.latency), lastEvents: kbd.log },
    hid: {
      status: hidStatus,
      devices: hidDevs.map((d) => ({
        name: d.name,
        ids: d.ids,
        collections: d.collections,
        error: d.error,
        reports: d.reports,
        reportGapMs: stats(d.intervals),
        changedReports: d.changeCount,
        changedReportGapMs: stats(d.changeIntervals),
        lastChanges: d.changes,
      })),
    },
  };
  return JSON.stringify(report, (_key, value) => (typeof value === 'number' ? Number(value.toFixed(3)) : value), 1);
}

// -------------------------------------------------------------- wiring up

function onClick(id: string, handler: () => void): void {
  el(id).addEventListener('click', () => {
    // Drop focus so a controller in keyboard mode cannot "click" the button with Space or Enter.
    (document.activeElement as HTMLElement | null)?.blur();
    handler();
  });
}

onClick('wiz-start', wizStart);
onClick('wiz-skip', wizSkip);
onClick('wiz-done', wizSkip);
onClick('timing-reset', resetTiming);
onClick('tap-start', tapStart);
onClick('tap-stop', tapStop);
onClick('hid-request', () => void requestHid());
onClick('report-build', () => {
  el<HTMLTextAreaElement>('report').value = buildReport();
  setText('report-status', 'Built. Copy it, or select the text below.');
});
onClick('report-copy', () => {
  const text = buildReport();
  el<HTMLTextAreaElement>('report').value = text;
  navigator.clipboard.writeText(text).then(
    () => setText('report-status', `Copied at ${new Date().toLocaleTimeString()}.`),
    () => setText('report-status', 'Copy was blocked. Select the text below and copy it by hand.'),
  );
});
el<HTMLInputElement>('fast-on').addEventListener('change', (e) => setFast((e.target as HTMLInputElement).checked));
el<HTMLButtonElement>('hid-request').disabled = !('hid' in navigator);

let lastSlowRender = 0;

function frame(rafTime: number): void {
  const now = performance.now();
  const pads = readPads();
  trackFrame(rafTime, now);
  trackTimestamps(pads, now, 'raf');
  wizSample(pads, now);
  if (tap.running && now >= tap.calibUntil) tapSampleFrame(pads, now);

  renderPads(pads);
  setText('wiz-prompt', wizPrompt(now));
  setText('tap-head', tapHead(now));
  if (now - lastSlowRender >= 250) {
    lastSlowRender = now;
    setText('padlog', padLog.join('\n'));
    renderWiz();
    renderTiming(now);
    renderTap();
    renderEvents();
    renderKbd();
    renderHid();
  }
  requestAnimationFrame(frame);
}

renderEnv();
renderFeatures();
requestAnimationFrame(frame);
