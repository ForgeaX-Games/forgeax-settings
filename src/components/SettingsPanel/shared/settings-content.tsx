import type { ReactNode } from 'react';

export function SettingsToast({ toast }: { toast: { kind: 'ok' | 'err'; text: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`settings-toast ${toast.kind}`} style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 'var(--z-toast)' }}>
      {toast.text}
    </div>
  );
}

export function formatProviderTestResult(result: {
  status: 'running' | 'ok' | 'err';
  totalMs?: number;
  ttftMs?: number;
  sawTool?: boolean;
  err?: string;
}): string {
  if (result.status === 'ok') {
    if (result.ttftMs !== undefined) {
      return `✓ ttft ${Math.round(result.ttftMs)}ms · total ${Math.round(result.totalMs ?? 0)}ms`;
    }
    if (result.sawTool) {
      return `✓ done · ${Math.round(result.totalMs ?? 0)}ms (tool-only turn)`;
    }
    return `✓ silent done · ${Math.round(result.totalMs ?? 0)}ms`;
  }
  return `✗ ${result.err?.slice(0, 80) ?? 'failed'}`;
}

export function renderInline(s: string): ReactNode {
  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < s.length) {
    if (s.startsWith('**', i)) {
      const end = s.indexOf('**', i + 2);
      if (end !== -1) {
        parts.push(<strong key={`b${key++}`} style={{ color: 'var(--text-primary)' }}>{s.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (s[i] === '`') {
      const end = s.indexOf('`', i + 1);
      if (end !== -1) {
        parts.push(
          <code
            key={`c${key++}`}
            style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-background-floating)', padding: '0 4px', borderRadius: 3, fontSize: '0.92em', color: 'var(--primary)', border: '1px solid var(--color-border-subtle)' }}
          >
            {s.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    const a = s.indexOf('**', i + 1);
    const b = s.indexOf('`', i + 1);
    const next = a === -1 ? b : b === -1 ? a : Math.min(a, b);
    const end = next === -1 ? s.length : next;
    parts.push(s.slice(i, end));
    i = end;
  }
  return parts;
}

export function MdLite({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = (key: number) => {
    if (bulletBuf.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} className="settings-md-list">
        {bulletBuf.map((b, idx) => (
          <li key={idx}>{renderInline(b)}</li>
        ))}
      </ul>,
    );
    bulletBuf = [];
  };
  text.split('\n').forEach((line, idx) => {
    const bullet = /^\s*-\s+(.+)$/.exec(line);
    if (bullet) { bulletBuf.push(bullet[1]); return; }
    flushBullets(idx);
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      blocks.push(<h4 key={`h-${idx}`} className="settings-md-h4">{renderInline(h3[1])}</h4>);
      return;
    }
    if (line.trim() === '') return;
    if (line.startsWith('> ')) {
      blocks.push(<blockquote key={`q-${idx}`} className="settings-md-quote">{renderInline(line.slice(2))}</blockquote>);
      return;
    }
    blocks.push(<p key={`p-${idx}`} className="settings-md-p">{renderInline(line)}</p>);
  });
  flushBullets(99999);
  return <>{blocks}</>;
}
