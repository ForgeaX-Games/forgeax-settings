export const BUILTIN_SETTINGS_SECTION_IDS = [
	"providers",
	"usage",
	"agents-v2",
	"extensions",
	"language",
	"shortcuts",
	"about",
] as const;

export const BUILTIN_SETTINGS_GROUP_ORDER = ["ai", "system", "about"] as const;

export const LEGACY_SETTINGS_REDIRECTS: Record<string, string> = {
	"api-keys": "providers",
	"cli-providers": "providers",
	plugins: "extensions",
	changelog: "about",
	models: "providers",
	"model-lab": "providers",
	agents: "agents-v2",
};

export const REMOVED_SETTINGS_SECTION_IDS = new Set([
	"agents",
	"capabilities",
	"fxpack",
	"author",
	"models",
	"model-lab",
	"upload",
	"feedback-delivery",
	"boot-splash",
	"memory",
	"workspace",
	"account",
]);

export function resolveSettingsSectionId(
	requested: string | null | undefined,
): string {
	if (!requested) return "providers";
	if (LEGACY_SETTINGS_REDIRECTS[requested])
		return LEGACY_SETTINGS_REDIRECTS[requested];
	if (REMOVED_SETTINGS_SECTION_IDS.has(requested)) return "providers";
	if ((BUILTIN_SETTINGS_SECTION_IDS as readonly string[]).includes(requested))
		return requested;
	return "providers";
}
