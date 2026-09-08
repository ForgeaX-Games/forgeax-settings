import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import { useTranslation } from '@forgeax/interface/i18n';
import { useSettingsSection } from '../store';
import { SettingsExtensionsPanel } from './SettingsExtensionsPanel';

function ExtensionsBody({ refreshKey }: { refreshKey: number }) {
  return (
    <div className="sp-section-fill">
      <SettingsExtensionsPanel refreshKey={refreshKey} />
    </div>
  );
}

/** Registers the extensions section with refresh in the panel header. */
export function ExtensionsSectionRegister() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);

  const headerActions = useMemo(() => (
    <button
      type="button"
      className="ba-refresh"
      onClick={() => setRefreshKey((k) => k + 1)}
      title={t('bus.refreshTitle')}
    >
      ↻ {t('settings.refresh')}
    </button>
  ), [t]);

  const node = useMemo(() => <ExtensionsBody refreshKey={refreshKey} />, [refreshKey]);

  useSettingsSection({
    id: 'extensions',
    label: t('settings.sections.extensions'),
    priority: 76,
    group: 'ai',
    icon: Network,
    headerActions,
    node,
  });

  return null;
}
