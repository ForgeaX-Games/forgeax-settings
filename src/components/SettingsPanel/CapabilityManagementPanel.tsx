import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  listSharedCapabilities,
  type SharedCapabilityInfo,
  type SharedCapabilityKind,
} from '@forgeax/interface/lib/extension-api';

type SharedResponse = {
  roots: {
    user: { extensions: string; commands: string; mcp: string };
    project: { extensions: string; commands: string; mcp: string };
  };
  mcp: Array<{ id: string; enabled: boolean; origin: string; configPath: string; command?: string; url?: string }>;
};

const KINDS: SharedCapabilityKind[] = ['mcp', 'skill', 'command', 'extension'];
const KERNEL_CAPABILITY_PREVIEW_LIMIT = 4;

/** Settings inventory for capabilities shared by every kernel. */
export function CapabilityManagementPanel() {
  const [items, setItems] = useState<SharedCapabilityInfo[]>([]);
  const [shared, setShared] = useState<SharedResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [capabilities, sharedRes] = await Promise.all([
        listSharedCapabilities(),
        fetch('/api/extensions/shared').then((res) => res.json() as Promise<SharedResponse>),
      ]);
      setItems(capabilities.capabilities);
      setShared(sharedRes);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const refreshRegistry = async () => {
    setBusy(true);
    try {
      await fetch('/api/extensions/reload', { method: 'POST' });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const count = (kind: SharedCapabilityKind) => items.filter((item) => item.kind === kind).length;

  return (
    <div className="sp-section-fill" style={{ display: 'grid', gap: 12 }}>
      <div className="settings-help">
        These capabilities are shared by all kernels. Kernel-native capabilities are shown in the selected kernel card.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {KINDS.map((kind) => <span key={kind} className="settings-cap-chip">{kind}: {count(kind)}</span>)}
        <button type="button" className="settings-edit-btn" onClick={() => void refreshRegistry()} disabled={busy}>
          <RefreshCw size={11} /> {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {shared && (
        <div className="settings-help">
          <div><strong>User</strong> · extensions <code>{shared.roots.user.extensions}</code> · commands <code>{shared.roots.user.commands}</code> · MCP <code>{shared.roots.user.mcp}/mcp.json</code></div>
          <div><strong>Project</strong> · extensions <code>{shared.roots.project.extensions}</code> · commands <code>{shared.roots.project.commands}</code> · MCP <code>{shared.roots.project.mcp}/mcp.json</code></div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 6 }}>
        {items.map((item) => (
          <div key={item.capabilityId} className="settings-provider-row">
            <div className="settings-provider-head">
              <span className="ok-pill">{item.kind}</span>
              <code className="settings-provider-id">{item.localId}</code>
              <span className="settings-provider-name">{item.origin}</span>
              {item.lifecycle.requiresRestart && <span className="settings-help">restart required</span>}
            </div>
            <div className="settings-help">{item.extensionId} · {item.extensionVersion}</div>
          </div>
        ))}
        {shared?.mcp.map((server) => (
          <div key={`mcp:${server.id}`} className="settings-provider-row">
            <div className="settings-provider-head">
              <span className="ok-pill">mcp</span>
              <code className="settings-provider-id">{server.id}</code>
              <span className="settings-provider-name">{server.origin}</span>
              <span className={server.enabled ? 'ok-pill' : 'err-pill'}>{server.enabled ? 'enabled' : 'disabled'}</span>
            </div>
            <div className="settings-help">{server.configPath} · {server.command ?? server.url ?? 'configured'}</div>
          </div>
        ))}
        {items.length === 0 && !shared?.mcp.length && <div className="settings-help">No shared capabilities found.</div>}
      </div>
    </div>
  );
}

/** Compact per-kernel projection shown directly under each provider card. */
export function KernelCapabilitySummary({ kernelId }: { kernelId: string }) {
  const [data, setData] = useState<{
    shared?: { capabilities: Array<{ kind: string; localId?: string }>; mcp: Array<{ id?: string }> };
    native?: { capabilities: Array<{ kind: string; id: string }> };
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/cli/capabilities?kernel=${encodeURIComponent(kernelId)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((value) => { if (alive) setData(value); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, [kernelId]);

  if (!data) return null;
  const sharedCount = (data.shared?.capabilities.length ?? 0) + (data.shared?.mcp.length ?? 0);
  const nativeCount = data.native?.capabilities.length ?? 0;
  const names = [...new Set([
    ...(data.shared?.capabilities ?? []).map((item) => item.localId ?? item.kind),
    ...(data.shared?.mcp ?? []).map((item) => item.id ?? 'mcp'),
    ...(data.native?.capabilities ?? []).map((item) => item.id),
  ])];
  const previewNames = names.slice(0, KERNEL_CAPABILITY_PREVIEW_LIMIT);
  const remainingCount = names.length - previewNames.length;
  return (
    <div className="settings-help">
      <span>Capabilities for {kernelId}: </span>
      <span className="settings-cap-chip">shared {sharedCount}</span>{' '}
      <span className="settings-cap-chip">kernel-native {nativeCount}</span>
      {nativeCount === 0 && <span> · this kernel does not expose a native catalog yet</span>}
      {previewNames.length > 0 && (
        <div style={{ marginTop: 4 }}>
          Visible examples: <code>{previewNames.join(' · ')}</code>
          {remainingCount > 0 && <> · +{remainingCount} more in Extensions → Capabilities</>}
        </div>
      )}
    </div>
  );
}
