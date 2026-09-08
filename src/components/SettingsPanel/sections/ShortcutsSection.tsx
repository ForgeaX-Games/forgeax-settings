import { useMemo, useState } from 'react';
import { Command } from 'lucide-react';
import { Section } from '@forgeax/interface/components/SettingsPrimitives';
import { buildShortcuts, type ShortcutDef } from '@forgeax/interface/lib/global-shortcuts';
import { comboDisplayParts } from '../combo-display-parts';
import { useTranslation } from '@forgeax/interface/i18n';
import { useSettingsSection } from '../store';

const GROUP_LABEL: Record<ShortcutDef['group'], string> = {
  layout:  'settings.shortcuts.groups.layout',
  mode:    'settings.shortcuts.groups.mode',
  edit:    'settings.shortcuts.groups.edit',
  overlay: 'settings.shortcuts.groups.overlay',
  focus:   'settings.shortcuts.groups.focus',
  general: 'settings.shortcuts.groups.general',
};

const GROUP_ORDER: Array<ShortcutDef['group']> = ['layout', 'overlay', 'mode', 'edit', 'focus', 'general'];

type ShortcutPlatform = 'mac' | 'windows';

function ComboBadge({ combo, platform }: { combo: string; platform: ShortcutPlatform }) {
  const parts = comboDisplayParts(combo, platform);
  const title = parts.join(' + ');
  return (
    <span className="settings-combo-badge">
      {parts.map((p, i) => (
        <kbd key={`${p}-${i}`} className="settings-combo-key" title={title}>
          {p}
        </kbd>
      ))}
    </span>
  );
}

function ShortcutsBody({ platform }: { platform: ShortcutPlatform }) {
  const { t, i18n } = useTranslation();
  const shortcuts = useMemo(() => buildShortcuts(), [i18n.language]);
  const grouped = useMemo(() => {
    const out = new Map<ShortcutDef['group'], ShortcutDef[]>();
    for (const s of shortcuts) {
      if (!out.has(s.group)) out.set(s.group, []);
      out.get(s.group)!.push(s);
    }
    return out;
  }, [shortcuts]);

  return (
    <Section icon={<Command size={14} />} title={t('settings.shortcuts.title')} hint={t('settings.shortcuts.hint')}>
      <p className="settings-shortcuts-intro dim">
        {t('settings.shortcuts.introBlenderPrefix')}
        {' '}
        {t('settings.shortcuts.introBlenderSuffix')}
        {' '}
        <strong>{t('settings.shortcuts.introImeSafe')}</strong>
        {t('settings.shortcuts.introImePrefix')}
        {t('settings.shortcuts.introImeSuffix')}
        {' '}
        {t('settings.shortcuts.introReadonlyPrefix')}
        {t('settings.shortcuts.introReadonlySuffix')}
      </p>
      <div className="settings-shortcuts">
        {GROUP_ORDER.map((g) => {
          const list = grouped.get(g);
          if (!list || list.length === 0) return null;
          return (
            <div key={g} className="settings-shortcuts-group">
              <div className="settings-shortcuts-group-label">{t(GROUP_LABEL[g])}</div>
              <table className="settings-shortcuts-table">
                <tbody>
                  {list.map((s) => (
                    <tr key={s.combo}>
                      <td className="settings-shortcuts-combo">
                        <ComboBadge combo={s.combo} platform={platform} />
                      </td>
                      <td className="settings-shortcuts-label">{s.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export function ShortcutsSectionRegister() {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<ShortcutPlatform>(() => {
    const p = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
      ?? navigator.platform
      ?? '';
    return /Mac|iPhone|iPad|iPod/i.test(p) || /Mac OS X/i.test(navigator.userAgent) ? 'mac' : 'windows';
  });

  const headerActions = useMemo(() => (
    <div className="settings-shortcuts-os sc-os-toggle" role="tablist" aria-label={t('settings.shortcuts.platformAria')}>
      <button
        type="button"
        role="tab"
        aria-selected={platform === 'mac'}
        className={`settings-shortcuts-os-btn ${platform === 'mac' ? 'is-active' : ''}`}
        onClick={() => setPlatform('mac')}
      >
        {t('settings.shortcuts.platformMac')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={platform === 'windows'}
        className={`settings-shortcuts-os-btn ${platform === 'windows' ? 'is-active' : ''}`}
        onClick={() => setPlatform('windows')}
      >
        {t('settings.shortcuts.platformWin')}
      </button>
    </div>
  ), [platform, t]);

  const node = useMemo(() => <ShortcutsBody platform={platform} />, [platform]);

  useSettingsSection({
    id: 'shortcuts',
    label: t('settings.shortcuts.title'),
    priority: 50,
    group: 'system',
    icon: Command,
    headerActions,
    node,
  });

  return null;
}
