import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { RosterAgentAvatarVideo } from './RosterAgentAvatarVideo';

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
