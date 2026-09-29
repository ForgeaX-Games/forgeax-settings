/** Settings extensions list — slim client for GET /api/extensions/list. */

export interface SettingsExtensionInfo {
	id: string;
	version: string;
	kind: string;
	displayName: { zh?: string; en?: string; ja?: string } | string;
	description?: { zh?: string; en?: string; ja?: string } | string;
	naming?: { title: string; sub: string };
}

export interface SettingsExtensionListResponse {
	kind: string | null;
	count: number;
	items: SettingsExtensionInfo[];
}

export function pickExtensionLang(
	text:
		| SettingsExtensionInfo["displayName"]
		| SettingsExtensionInfo["description"],
	lang: "zh" | "en" = "zh",
	fallback = "",
): string {
	if (!text) return fallback;
	if (typeof text === "string") return text;
	return text[lang] ?? text.zh ?? text.en ?? fallback;
}

export async function listSettingsExtensions(): Promise<SettingsExtensionListResponse> {
	const empty: SettingsExtensionListResponse = {
		kind: null,
		count: 0,
		items: [],
	};
	const res = await fetch("/api/extensions/list");
	if (!res.ok) return empty;
	if (!res.headers.get("content-type")?.includes("application/json"))
		return empty;
	const payload = (await res.json()) as Partial<SettingsExtensionListResponse>;
	if (!Array.isArray(payload.items)) return empty;
	return {
		kind: payload.kind ?? null,
		count: payload.count ?? payload.items.length,
		items: payload.items,
	};
}
