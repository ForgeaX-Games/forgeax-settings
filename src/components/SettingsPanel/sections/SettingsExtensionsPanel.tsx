import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@forgeax/interface/i18n';
import { listSettingsExtensions } from '../../../lib/extensions-api';
import { filterExtensionGroups, groupExtensionsByKind } from '../../../lib/extensions-group';
import { SettingsExtensionsTable } from './SettingsExtensionsTable';

export function SettingsExtensionsPanel({ refreshKey }: { refreshKey?: number }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'en' ? 'en' : 'zh') as 'zh' | 'en';
  const [items, setItems] = useState<Awaited<ReturnType<typeof listSettingsExtensions>>['items']>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [refreshTs, setRefreshTs] = useState(Date.now());

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    listSettingsExtensions()
      .then((r) => {
        if (cancel) return;
        setItems(r.items);
        setErr(null);
      })
      .catch((e: Error) => {
        if (cancel) return;
        setErr(e.message);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => { cancel = true; };
  }, [refreshTs]);

  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return;
    setRefreshTs(Date.now());
  }, [refreshKey]);

  const groups = useMemo(() => {
    const all = groupExtensionsByKind(items);
    return filterExtensionGroups(all, query);
  }, [items, query]);

  const filtered = query.length > 0;

  return (
    <div className="settings-extensions">
      {!loading && items.length > 0 && (
        <div className="ba-filterbar ba-filterbar--settings">
          <input
            type="text"
            className="ba-search"
            placeholder={t('bus.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
          {filtered && (
            <button
              type="button"
              className="ba-reset"
              onClick={() => setQuery('')}
              title={t('bus.resetTitle')}
            >
              ✕ {t('bus.reset')}
            </button>
          )}
        </div>
      )}
      {err && (
        <div className="settings-extensions-error">{t('bus.requestFailed', { err })}</div>
      )}
      {loading && <p className="dim">{t('common.loading')}</p>}
      {!loading && !err && items.length === 0 && (
        <p className="dim">{t('bus.emptyNoExtensions')}</p>
      )}
      {!loading && !err && items.length > 0 && groups.length === 0 && (
        <p className="dim">{t('bus.emptyNoMatch')}</p>
      )}
      {!loading && groups.length > 0 && (
        <SettingsExtensionsTable groups={groups} lang={lang} />
      )}
    </div>
  );
}
