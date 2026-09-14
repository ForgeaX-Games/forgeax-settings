import { notifyConfigChanged, onConfigChanged } from '@forgeax/interface/lib/config-invalidation';
/**
 * MemorySettingsSection — 记忆自动沉淀开关(总开关 + 分模型开关)。
 *
 * 后端 /api/memory-settings:GET → { config:{master,perKernel}, kernels:[{id,cacheWarmCapable}] };
 * PUT → 保存 config。前端**不依赖 @forgeax/***(interface 保持 agnostic)——生效逻辑就是
 * 极简布尔:`enabled = master && (perKernel[id] ?? cacheWarmCapable)`;无缓存能力的内核开启时
 * 提示会额外消耗少量 token。设计稿 §4/§8。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from '@forgeax/interface/i18n';

interface KernelCap {
  id: string;
  cacheWarmCapable: boolean;
}
interface MemCfg {
  master: boolean;
  perKernel: Record<string, boolean>;
}

const rowStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12 } as const;
const hintStyle = { fontSize: 11, opacity: 0.6, marginTop: 2 } as const;

export function MemorySettingsSection(): ReactNode {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<MemCfg>({ master: true, perKernel: {} });
  const [kernels, setKernels] = useState<KernelCap[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    let alive = true;
    const reload = () => { void fetch('/api/memory-settings')
      .then((r) => r.json())
      .then((j: { config?: MemCfg; kernels?: KernelCap[] }) => {
        if (!alive) return;
        if (j?.config) setCfg({ master: !!j.config.master, perKernel: j.config.perKernel ?? {} });
        if (Array.isArray(j?.kernels)) setKernels(j.kernels);
        setReady(true);
      })
      .catch(() => { if (alive) setReady(true); }); };
    reload();
    const unsubscribe = onConfigChanged('memory-settings', reload);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const save = (patch: { master: boolean } | { kernelId: string; enabled: boolean }): void => {
    setSaving(true);
    setSaveError(false);
    void fetch('/api/memory-settings', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json() as { config: MemCfg };
      setCfg(body.config);
      notifyConfigChanged('memory-settings');
    }).catch(() => setSaveError(true)).finally(() => setSaving(false));
  };

  /** 分模型生效:perKernel 覆盖优先,缺省按 cacheWarmCapable(warm→ON,cold→OFF)。 */
  const perKernelEnabled = (k: KernelCap): boolean => cfg.perKernel[k.id] ?? k.cacheWarmCapable;

  const toggleMaster = (): void => save({ master: !cfg.master });
  const togglePerKernel = (k: KernelCap): void =>
    save({ kernelId: k.id, enabled: !perKernelEnabled(k) });

  if (!ready) return <div style={hintStyle}>{t('common.loading')}</div>;

  return (
    <div>
      <label style={{ ...rowStyle, fontWeight: 600 }}>
        <input type="checkbox" checked={cfg.master} disabled={saving} aria-invalid={saveError} onChange={toggleMaster} />
        {t('settings.memory.masterLabel')}
      </label>
      <div style={hintStyle}>{t('settings.memory.masterHint')}</div>

      <div style={{ marginTop: 12, opacity: cfg.master ? 1 : 0.45, pointerEvents: cfg.master ? 'auto' : 'none' }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{t('settings.memory.byKernel')}</div>
        {kernels.length === 0 && <div style={hintStyle}>{t('settings.memory.noKernels')}</div>}
        {kernels.map((k) => {
          const on = perKernelEnabled(k);
          return (
            <div key={k.id}>
              <label style={rowStyle}>
                <input type="checkbox" checked={on} onChange={() => togglePerKernel(k)} disabled={!cfg.master || saving} aria-invalid={saveError} />
                <span>{k.id}</span>
                {k.cacheWarmCapable ? (
                  <span style={{ fontSize: 10, color: '#4caf50', opacity: 0.85 }}>
                    {t('settings.memory.lowestTokenUsage')}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: '#e0a030', opacity: 0.9 }}>
                    {t('settings.memory.additionalTokenCost')}
                  </span>
                )}
              </label>
              {!k.cacheWarmCapable && on && cfg.master && (
                <div style={{ ...hintStyle, color: '#e0a030' }}>
                  {t('settings.memory.additionalTokenHint', { kernel: k.id })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
