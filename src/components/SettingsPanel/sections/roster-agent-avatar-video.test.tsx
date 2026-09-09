import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { observeAvatarPlayback, RosterAgentAvatarVideo } from './RosterAgentAvatarVideo';

const state = { state: 'idle', url: '/avatar.webm', loop: true, fadeInMs: 160 };
const rules = { default: 'idle', fallback: 'idle', states: { idle: state } };

test('offers the supplied HEVC desktop source before the WebM fallback', () => {
  const html = renderToStaticMarkup(<RosterAgentAvatarVideo size={32} rules={{ ...rules,
    states: { idle: { ...state, desktopUrl: '/avatar.desktop.mov' } } }} />);
  expect(html).toContain('src="/avatar.desktop.mov"');
  expect(html).toContain('src="/avatar.webm"');
  expect(html.indexOf('/avatar.desktop.mov')).toBeLessThan(html.indexOf('/avatar.webm'));
  expect(html).toContain('video/quicktime');
  expect(html).toContain('video/webm');
  expect(html).toContain('muted=""');
  expect(html).toContain('playsInline=""');
});

test('does not invent a desktop URL when the catalog only contains WebM', () => {
  const html = renderToStaticMarkup(<RosterAgentAvatarVideo size={32} rules={rules} />);
  expect(html).toContain('/avatar.webm');
  expect(html).not.toContain('.desktop.mov');
});

test('does not create a video for an agent without avatar rules', () => {
  expect(renderToStaticMarkup(<RosterAgentAvatarVideo size={32} />)).not.toContain('<video');
});

// Exercise the same playback lifecycle used by the component effect without a
// browser decoder. Geometry and observer events are supplied by the webview.

function playbackHarness(withObserver = true) {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const view = Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600 });
  let notify: IntersectionObserverCallback;
  let observed: Element | undefined;
  let disconnected = false;
  let plays = 0;
  let pauses = 0;
  let rejectPlay = false;
  let rect = { width: 32, height: 32, top: 20, left: 20, bottom: 52, right: 52 };
  if (withObserver) Object.assign(view, {
    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe(target: Element) { observed = target; }
      disconnect() { disconnected = true; }
    },
  });
  Object.assign(doc, { defaultView: view });
  const video = {
    ownerDocument: doc,
    play: () => { plays++; return rejectPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); },
    pause: () => { pauses++; },
    getBoundingClientRect: () => rect,
  } as unknown as HTMLVideoElement;
  const cleanup = observeAvatarPlayback(video);
  return {
    video, cleanup,
    get plays() { return plays; },
    get pauses() { return pauses; },
    get observed() { return observed; },
    get disconnected() { return disconnected; },
    set rejectPlay(value: boolean) { rejectPlay = value; },
    intersect(visible: boolean, ratio = visible ? 1 : 0) {
      notify!([{ target: video, isIntersecting: visible, intersectionRatio: ratio } as IntersectionObserverEntry], {} as IntersectionObserver);
    },
    visibility(value: string) { doc.visibilityState = value; doc.dispatchEvent(new Event('visibilitychange')); },
    bounds(top: number, event = 'scroll') {
      rect = { ...rect, top, bottom: top + 32 };
      view.dispatchEvent(new Event(event));
    },
  };
}

test('defers loading and autoplay until visibility is known', () => {
  const html = renderToStaticMarkup(<RosterAgentAvatarVideo size={32} rules={rules} />);
  expect(html).toContain('preload="none"');
  expect(html.toLowerCase()).not.toContain('autoplay');
  const avatar = playbackHarness();
  expect(avatar.observed).toBe(avatar.video);
  expect(avatar.plays).toBe(0);
  avatar.intersect(false);
  avatar.intersect(true, 0);
  expect(avatar.plays).toBe(0);
  avatar.cleanup();
});

test('plays intersecting avatars once and pauses them when scrolled away', () => {
  const avatar = playbackHarness();
  avatar.intersect(true);
  avatar.intersect(true);
  expect(avatar.plays).toBe(1);
  avatar.intersect(false);
  expect(avatar.pauses).toBe(1);
  avatar.intersect(true);
  expect(avatar.plays).toBe(2);
  avatar.cleanup();
});

test('hidden pages pause playback and only visible avatars resume', () => {
  const avatar = playbackHarness();
  avatar.visibility('hidden');
  avatar.intersect(true);
  expect(avatar.plays).toBe(0);
  avatar.visibility('visible');
  expect(avatar.plays).toBe(1);
  avatar.visibility('hidden');
  expect(avatar.pauses).toBe(1);
  avatar.intersect(false);
  avatar.visibility('visible');
  expect(avatar.plays).toBe(1);
  avatar.cleanup();
});

test('cleanup pauses and disconnects, ignoring queued observer and visibility events', () => {
  const avatar = playbackHarness();
  avatar.intersect(true);
  avatar.cleanup();
  expect(avatar.disconnected).toBe(true);
  expect(avatar.pauses).toBe(1);
  avatar.intersect(true);
  avatar.visibility('hidden');
  avatar.visibility('visible');
  expect(avatar.plays).toBe(1);
  expect(avatar.pauses).toBe(1);
});

test('handles rejected play promises without preventing subsequent visibility transitions', async () => {
  const avatar = playbackHarness();
  avatar.rejectPlay = true;
  avatar.intersect(true);
  await Promise.resolve();
  avatar.intersect(false);
  avatar.rejectPlay = false;
  avatar.intersect(true);
  expect(avatar.plays).toBe(2);
  avatar.cleanup();
});

test('older webviews use viewport bounds, page visibility, scroll and resize with cleanup', () => {
  const avatar = playbackHarness(false);
  expect(avatar.plays).toBe(1);
  avatar.bounds(700);
  expect(avatar.pauses).toBe(1);
  avatar.bounds(20, 'resize');
  expect(avatar.plays).toBe(2);
  avatar.visibility('hidden');
  expect(avatar.pauses).toBe(2);
  avatar.bounds(30);
  expect(avatar.plays).toBe(2);
  avatar.visibility('visible');
  expect(avatar.plays).toBe(3);
  avatar.cleanup();
  avatar.bounds(700);
  avatar.bounds(20, 'resize');
  avatar.visibility('visible');
  expect(avatar.plays).toBe(3);
  expect(avatar.pauses).toBe(3);
});


test('a large roster only starts videos whose observer reports them visible', () => {
  const roster = Array.from({ length: 40 }, () => playbackHarness());
  expect(roster.reduce((sum, avatar) => sum + avatar.plays, 0)).toBe(0);
  for (const avatar of roster.slice(0, 4)) avatar.intersect(true);
  expect(roster.reduce((sum, avatar) => sum + avatar.plays, 0)).toBe(4);
  for (const avatar of roster.slice(0, 4)) avatar.intersect(false);
  for (const avatar of roster.slice(4, 8)) avatar.intersect(true);
  expect(roster.reduce((sum, avatar) => sum + avatar.plays, 0)).toBe(8);
  expect(roster.reduce((sum, avatar) => sum + avatar.pauses, 0)).toBe(4);
  for (const avatar of roster) avatar.cleanup();
});

test('replacing a source disposes its playback lifecycle before starting a fresh one', () => {
  const previousSource = playbackHarness();
  previousSource.intersect(true);
  previousSource.cleanup();
  const nextSource = playbackHarness();
  expect(previousSource.disconnected).toBe(true);
  expect(previousSource.pauses).toBe(1);
  expect(nextSource.plays).toBe(0);
  nextSource.intersect(true);
  expect(nextSource.plays).toBe(1);
  previousSource.intersect(true);
  expect(previousSource.plays).toBe(1);
  nextSource.cleanup();
});
