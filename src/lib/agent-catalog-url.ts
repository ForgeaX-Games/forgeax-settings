import { getLocale } from '@forgeax/interface/i18n';

/** Build `/api/agents` with labels aligned to the Studio locale. */
export function agentCatalogUrl(extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ lang: getLocale() });
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  return `/api/agents?${params.toString()}`;
}
