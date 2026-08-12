/**
 * KernelPermissionSelect — provider 行里的权限档位下拉(一个内核一个)。
 *
 * 放在 Providers 区而不是独立 section:权限是 provider 的属性,跟「哪个在用」并排才
 * 一眼看得出「当前生效的内核 + 它的放行姿态」。少一个 settings section。
 *
 * 后端 /api/kernel-permissions:GET → { config:{perKernel}, kernels:[{id,supported,
 * defaultMode,configured?,lowGearHangs?}], defaultMode };PUT → 保存 config。
 *
 * 两个刻意的设计:
 *  1. **选项来自后端 `supported`**,不是前端写死四档 —— 各内核能兑现的档差别很大
 *     (cursor 只有一档、codex 两档),写死会让用户选到内核根本做不到的档。某内核只
 *     出现一项是如实反映能力。目录里没有该内核 → 不渲染(它没有 spawn 期档位面)。
 *  2. **模块级共享一次 fetch**:provider 行有 N 个,各自 useEffect 会打 N 次请求。
 *     这里用模块级缓存 + 订阅,N 行共用一次 GET,写入后广播给所有行。
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation, type TFunction } from '@forgeax/interface/i18n';

type PermissionMode = 'gated' | 'autoEdits' | 'planning' | 'unrestricted';

interface KernelPermissionCap {
  id: string;
  supported: PermissionMode[];
  defaultMode: PermissionMode;
  configured?: PermissionMode;
  /** 低于全权限的档可能把该内核卡住(后端如实声明,不替用户抬档)。 */
  lowGearHangs?: boolean;
}

interface Snapshot {
  perKernel: Record<string, PermissionMode>;
  kernels: KernelPermissionCap[];
  defaultMode: PermissionMode;
}

const FOLLOW_DEFAULT = '__default__';

// ─── 模块级共享状态(一次 GET,多行订阅) ────────────────────────────────
let snapshot: Snapshot | null = null;
let inflight: Promise<void> | null = null;
let loaded = false;
let confirmedPerKernel: Record<string, PermissionMode> = {};
let pendingSave: Promise<void> = Promise.resolve();
let saveRevision = 0;
const subscribers = new Set<() => void>();

function emit(): void {
  for (const fn of subscribers) fn();
}

function load(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch('/api/kernel-permissions');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const j = await response.json() as {
          config?: { perKernel?: Record<string, PermissionMode> };
          kernels?: KernelPermissionCap[];
          defaultMode?: PermissionMode;
        };
        const perKernel = j?.config?.perKernel ?? {};
        snapshot = {
          perKernel,
          kernels: Array.isArray(j?.kernels) ? j.kernels : [],
          defaultMode: j?.defaultMode ?? 'unrestricted',
        };
        confirmedPerKernel = { ...perKernel };
        loaded = true;
        emit();
        return;
      } catch {
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }

    // 后端不可用 → 空快照:下拉直接不渲染,不在设置页留一个坏控件。
    // `inflight` 在 finally 中释放,后续 Settings mount 可以重新尝试。
    snapshot = { perKernel: {}, kernels: [], defaultMode: 'unrestricted' };
    emit();
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function save(next: Record<string, PermissionMode>): Promise<void> {
  if (!snapshot) return Promise.resolve();
  const revision = ++saveRevision;
  snapshot = { ...snapshot, perKernel: next };
  emit();

  // Keep writes ordered: selecting two gears quickly must not let an older
  // request arrive after the newer one and overwrite the final posture.
  const request = pendingSave.then(async () => {
    const response = await fetch('/api/kernel-permissions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ perKernel: next }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json().catch(() => null) as { config?: { perKernel?: Record<string, PermissionMode> } } | null;
    confirmedPerKernel = { ...(body?.config?.perKernel ?? next) };
    if (revision === saveRevision && snapshot) {
      snapshot = { ...snapshot, perKernel: { ...confirmedPerKernel } };
      emit();
    }
  });
  pendingSave = request.catch(() => {});
  return request.catch((error) => {
    if (revision === saveRevision && snapshot) {
      snapshot = { ...snapshot, perKernel: { ...confirmedPerKernel } };
      emit();
    }
    throw error;
  });
}

function useSnapshot(): Snapshot | null {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = (): void => bump((n) => n + 1);
    subscribers.add(fn);
    void load();
    return () => {
      subscribers.delete(fn);
    };
  }, []);
  return snapshot;
}

/** 悬浮说明:默认档 + 「全权限也拦得住」+ 该内核的诚实告警。挤在一个 title 里,
 *  这样 provider 行只多一个控件、不多出几行文字。 */
function tooltip(cap: KernelPermissionCap, effective: PermissionMode, defaultMode: PermissionMode, t: TFunction): string {
  const label = (m: PermissionMode): string => t(`settings.kernelPermissions.mode.${m}`);
  const parts = [
    t('settings.kernelPermissions.hint', { mode: label(defaultMode) }),
    t('settings.kernelPermissions.denyStillApplies'),
  ];
  if (cap.supported.length === 1) parts.push(t('settings.kernelPermissions.singleGearHint', { kernel: cap.id }));
  if (cap.lowGearHangs && effective !== 'unrestricted') {
    parts.push(t('settings.kernelPermissions.riskyGearHint', { kernel: cap.id }));
  }
  return parts.join('\n');
}

export function KernelPermissionSelect({ kernelId }: { kernelId: string }): ReactNode {
  const { t } = useTranslation();
  const snap = useSnapshot();
  const [saveError, setSaveError] = useState(false);
  const cap = snap?.kernels.find((k) => k.id === kernelId);
  // 该内核没有 spawn 期/审批面的档位声明 → 不渲染(不暗示一个不存在的旋钮)。
  if (!snap || !cap) return null;

  const configured = snap.perKernel[kernelId];
  const effective = configured ?? cap.defaultMode;
  const label = (m: PermissionMode): string => t(`settings.kernelPermissions.mode.${m}`);

  const pick = (value: string): void => {
    const next = { ...snap.perKernel };
    setSaveError(false);
    // 「跟随默认」= 删掉覆盖键(而非写入默认值),这样以后改全局默认能跟着走。
    if (value === FOLLOW_DEFAULT) delete next[kernelId];
    else next[kernelId] = value as PermissionMode;
    void save(next).catch(() => setSaveError(true));
  };

  return (
    <>
      <select
        className="settings-select settings-perm-select"
        aria-label={t('settings.kernelPermissions.title')}
        aria-invalid={saveError || undefined}
        title={tooltip(cap, effective, snap.defaultMode, t)}
        value={configured ?? FOLLOW_DEFAULT}
        onChange={(e) => pick(e.target.value)}
      >
        <option value={FOLLOW_DEFAULT}>{t('settings.kernelPermissions.followDefault', { mode: label(cap.defaultMode) })}</option>
        {cap.supported.map((m) => (
          <option key={m} value={m}>{label(m)}</option>
        ))}
      </select>
      {saveError && <span className="settings-test-result is-err" role="alert">{t('common.error')}</span>}
    </>
  );
}
