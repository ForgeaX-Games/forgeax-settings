import type { Locale } from "../runtime";

/** Build `/api/agents` with labels aligned to the Studio locale. */
export function agentCatalogUrl(
	locale: Locale,
	extra?: Record<string, string | undefined>,
): string {
	const params = new URLSearchParams({ lang: locale });
	for (const [key, value] of Object.entries(extra ?? {})) {
		if (value !== undefined && value !== "") params.set(key, value);
	}
	return `/api/agents?${params.toString()}`;
}
