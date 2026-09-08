import { useEffect, useState } from 'react';
import type { RosterAgentAvatarRules } from './roster-agent-avatar-types';

function pickIdleState(rules: RosterAgentAvatarRules) {
  const name = rules.default;
  return rules.states[name] ?? rules.states[rules.fallback] ?? Object.values(rules.states)[0] ?? null;
}

/** Settings roster idle avatar — uses catalog `avatarRules` only; no package registry. */
export function RosterAgentAvatarVideo({
  rules,
  size,
  className,
}: {
  rules?: RosterAgentAvatarRules;
  size: number;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const state = rules ? pickIdleState(rules) : null;
  const videoUrl = state?.url ?? null;
  const desktopUrl = state?.desktopUrl;

  useEffect(() => {
    setReady(false);
  }, [videoUrl, desktopUrl]);

  return (
    <span
      className={['roster-agent-avatar-video', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {videoUrl && (
        <video
          key={`${desktopUrl ?? ''}|${videoUrl}`}
          className={`roster-agent-avatar-vid${ready ? ' is-ready' : ''}`}
          autoPlay
          muted
          playsInline
          loop={state?.loop ?? true}
          style={{ transition: `opacity ${state?.fadeInMs ?? 160}ms ease` }}
          onLoadedData={() => setReady(true)}
        >
          {desktopUrl && <source src={desktopUrl} type={'video/quicktime; codecs="hvc1"'} />}
          <source src={videoUrl} type="video/webm" />
        </video>
      )}
    </span>
  );
}
