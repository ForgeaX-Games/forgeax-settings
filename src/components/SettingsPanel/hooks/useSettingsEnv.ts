import { notifyConfigChanged } from '@forgeax/interface/lib/config-invalidation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@forgeax/interface/i18n';

export interface SettingsData {
  env: Record<string, string | null>;
  paths: {
    projectRoot: string;
    envPath: string;
    studioPorts?: { ui: number; server: number; engine: number };
  };
}

const LLM_CRED_KEYS = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'GEMINI_API_KEY',
  'LITELLM_PROXY_KEY',
  'LITELLM_PROXY_BASE_URL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
]);

export function useSettingsEnv() {
  const { t } = useTranslation();
  const [data, setData] = useState<SettingsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/settings');
      setData((await r.json()) as SettingsData);
    } catch { /* offline */ }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const flash = useCallback((kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const envOf = useCallback((k: string): string | null => data?.env?.[k] ?? null, [data]);

  const patchEnv = useCallback(async (patch: Record<string, string>): Promise<boolean> => {
    setBusy(true);
    try {
      const r = await fetch('/api/settings/env', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; touched?: number };
      if (!r.ok || !j.ok) {
        flash('err', j.error ?? `HTTP ${r.status}`);
        return false;
      }
      flash('ok', t('settings.env.saved', { count: j.touched ?? 0 }));
      await reload();
      if (Object.keys(patch).some((k) => LLM_CRED_KEYS.has(k))) {
        try {
          notifyConfigChanged('models');
        } catch { /* catalog refresh is best-effort */ }
      }
      return true;
    } catch (e) {
      flash('err', (e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [flash, reload, t]);

  return { data, busy, setBusy, toast, flash, envOf, patchEnv, reload };
}
