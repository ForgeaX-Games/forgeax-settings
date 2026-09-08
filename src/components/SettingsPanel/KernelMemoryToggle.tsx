/**
 * KernelMemoryToggle — per-kernel memory checkbox in Providers rows.
 * Shares one GET with all rows via module-level cache (same pattern as KernelPermissionSelect).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from '@forgeax/interface/i18n';

interface KernelCap {
  id: string;
  cacheWarmCapable: boolean;
}

interface Snapshot {
  master: boolean;
  perKernel: Record<string, boolean>;
  kernels: KernelCap[];
}

let snapshot: Snapshot | null = null;
let inflight: Promise<void> | null = null;
let loaded = false;
const subscribers = new Set<() => void>();

function emit(): void {
  for (const fn of subscribers) fn();
}

function load(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const r = await fetch('/api/memory-settings');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json() as { config?: { master?: boolean; perKernel?: Record<string, boolean> }; kernels?: KernelCap[] };
      snapshot = {
        master: !!j?.config?.master,
        perKernel: j?.config?.perKernel ?? {},
        kernels: Array.isArray(j?.kernels) ? j.kernels : [],
      };
      loaded = true;
      emit();
    } catch {
      snapshot = { master: true, perKernel: {}, kernels: [] };
      loaded = true;
      emit();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

function perKernelEnabled(kernelId: string): boolean {
  if (!snapshot) return false;
  const cap = snapshot.kernels.find((k) => k.id === kernelId);
  return snapshot.perKernel[kernelId] ?? cap?.cacheWarmCapable ?? false;
}

function save(next: Snapshot): void {
  snapshot = next;
  emit();
  void fetch('/api/memory-settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ master: next.master, perKernel: next.perKernel }),
  }).catch(() => {});
}

export function KernelMemoryToggle({ kernelId }: { kernelId: string }): ReactNode {
  const { t } = useTranslation();
  const [, tick] = useState(0);

  useEffect(() => {
    const sub = () => tick((n) => n + 1);
    subscribers.add(sub);
    void load().then(sub);
    return () => { subscribers.delete(sub); };
  }, []);

  if (!loaded || !snapshot) return null;
  const cap = snapshot.kernels.find((k) => k.id === kernelId);
  if (!cap) return null;

  const checked = snapshot.master && perKernelEnabled(kernelId);

  return (
    <label className="settings-memory-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={!snapshot.master}
        aria-label={t('settings.memory.toggle')}
        onChange={() => {
          const on = perKernelEnabled(kernelId);
          save({
            ...snapshot!,
            perKernel: { ...snapshot!.perKernel, [kernelId]: !on },
          });
        }}
      />
      <span>{t('settings.memory.toggle')}</span>
    </label>
  );
}
