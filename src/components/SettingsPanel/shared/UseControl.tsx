import type { TFunction } from '@forgeax/interface/i18n';
import type { ActiveSourceId } from '@forgeax/interface/lib/model-route';

/** "Set as active" / "In use" control for a model source (Providers panel). */
export function UseControl({ id, activeSource, eligible, reason, onUse, t, busy }: {
  id: string;
  activeSource: ActiveSourceId;
  eligible: boolean;
  reason?: string;
  onUse: () => void;
  t: TFunction;
  busy: boolean;
}) {
  if (activeSource === id) {
    return (
      <span className="use-pill">{t('settings.providers.inUse')}</span>
    );
  }
  return (
    <button
      type="button"
      className="settings-edit-btn use-btn"
      disabled={!eligible || busy}
      title={!eligible ? (reason ?? '') : ''}
      onClick={onUse}
    >
      {t('settings.providers.setActive')}
    </button>
  );
}
