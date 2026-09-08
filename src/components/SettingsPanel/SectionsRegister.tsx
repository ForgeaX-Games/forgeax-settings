/**
 * SectionsRegister — mounts once at App root and registers the six built-in
 * Settings sections into the panel registry.
 */

import { useEffect, useMemo } from 'react';
import { Activity, Globe, Info, Plug, Users } from 'lucide-react';
import { useShellStore } from '@forgeax/interface/store';
import { LanguageSection } from './sections/LanguageSection';
import { useTranslation } from '@forgeax/interface/i18n';
import { useSettingsSection } from './store';
import { useSettingsEnv } from './hooks/useSettingsEnv';
import { useSettingsProviders } from './hooks/useSettingsProviders';
import { ProvidersSection } from './sections/ProvidersSection';
import { UsageSection } from './sections/UsageSection';
import { ExtensionsSectionRegister } from './sections/ExtensionsSection';
import { ShortcutsSectionRegister } from './sections/ShortcutsSection';
import { AboutSection } from './sections/AboutSection';
import { AgentsSection } from './sections/AgentsSection';
import { SettingsToast } from './shared/settings-content';
import {
  LEGACY_SETTINGS_REDIRECTS,
  REMOVED_SETTINGS_SECTION_IDS,
} from './settings-section-catalog';
import './SettingsPanelContent.css';

export function SettingsSectionsRegister() {
  const { t } = useTranslation();
  const { data, busy, setBusy, toast, flash, envOf, patchEnv, reload } = useSettingsEnv();
  const providers = useSettingsProviders(flash, reload, envOf, setBusy);

  const overlayParam = useShellStore((s) => s.overlayParam);
  const setOverlayParam = useShellStore((s) => s.setOverlayParam);

  useEffect(() => {
    if (!overlayParam) return;
    if (LEGACY_SETTINGS_REDIRECTS[overlayParam]) {
      setOverlayParam(LEGACY_SETTINGS_REDIRECTS[overlayParam]);
      return;
    }
    if (REMOVED_SETTINGS_SECTION_IDS.has(overlayParam)) {
      setOverlayParam('providers');
    }
  }, [overlayParam, setOverlayParam]);

  const providersNode = useMemo(() => (
    <ProvidersSection
      dataLoaded={!!data}
      busy={busy}
      envOf={envOf}
      patchEnv={patchEnv}
      providers={providers.providers}
      nativeProvider={providers.nativeProvider}
      providersCachedAt={providers.providersCachedAt}
      tests={providers.tests}
      activeSource={providers.activeSource}
      reloadProviders={providers.reloadProviders}
      testProvider={providers.testProvider}
      useModelSource={providers.useModelSource}
    />
  ), [data, busy, envOf, patchEnv, providers]);

  const usageNode = useMemo(() => <UsageSection />, []);
  const agentsNode = useMemo(() => <AgentsSection />, []);
  const aboutNode = useMemo(() => <AboutSection data={data} />, [data]);

  useSettingsSection({ id: 'providers', label: t('settings.nav.providers'), priority: 90, group: 'ai', icon: Plug, node: providersNode });
  useSettingsSection({ id: 'usage', label: t('settings.usage.title'), priority: 80, group: 'ai', icon: Activity, node: usageNode });
  useSettingsSection({
    id: 'agents-v2',
    label: t('settings.nav.agents'),
    priority: 74,
    group: 'ai',
    icon: Users,
    node: agentsNode,
  });
  useSettingsSection({ id: 'language', label: t('settings.language.label'), priority: 60, group: 'system', icon: Globe, node: <LanguageSection /> });
  useSettingsSection({ id: 'about', label: t('settings.nav.about'), priority: 40, group: 'about', icon: Info, node: aboutNode });

  return (
    <>
      <ExtensionsSectionRegister />
      <ShortcutsSectionRegister />
      <SettingsToast toast={toast} />
    </>
  );
}
