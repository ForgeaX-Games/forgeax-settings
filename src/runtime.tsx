import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

export type Locale = "en" | "zh";
export type TFunction = (
	key: string,
	vars?: Record<string, string | number>,
) => string;
export type ActiveSourceId = "api-key" | string | null;
export type ModelSource =
	| { kind: "api-key"; model: string }
	| { kind: "cli"; providerId: string };

export interface ShortcutDef {
	combo: string;
	label: string;
	group: "layout" | "mode" | "overlay" | "focus" | "general" | "edit";
}

export type SharedCapabilityKind =
	| "skill"
	| "command"
	| "mcp"
	| "extension"
	| "memory"
	| "tool";

export interface SharedCapabilityInfo {
	capabilityId: string;
	kind: SharedCapabilityKind;
	extensionId: string;
	extensionVersion: string;
	origin: "builtin" | "user" | "project";
	localId: string;
	lifecycle: { requiresRestart: boolean };
}

export interface SharedCapabilityListResponse {
	generation: number;
	loadedAt: number;
	capabilities: SharedCapabilityInfo[];
	issues: string[];
}

export interface RuntimeProviderRow {
	id: string;
	displayName: string;
	capabilities: Record<string, boolean>;
	health: { ok: boolean; detail?: string; pending?: boolean };
}

export interface SettingsRuntime {
	t: TFunction;
	locale: Locale;
	changeLanguage(locale: Locale): void;
	providerOverride: string | null;
	buildShortcuts(): ShortcutDef[];
	fetchCliProviders(force?: boolean): Promise<{
		providers: RuntimeProviderRow[];
		cachedAt: number;
	}>;
	listSharedCapabilities(): Promise<SharedCapabilityListResponse>;
	refreshAllModelCatalogs(): Promise<void>;
	deriveActiveSource(
		providerOverride: string | null,
		forgeaxModel: string | null,
	): ActiveSourceId;
	currentCatalogProvider(providerOverride: string | null): string | null;
	resetOpenSessionsModelToProviderDefault(
		providerId: string | null,
	): Promise<{ selected: string; count: number } | null>;
	applyModelRoute(source: ModelSource): Promise<void>;
}

const SettingsRuntimeContext = createContext<SettingsRuntime | null>(null);

export function SettingsRuntimeProvider({
	runtime,
	children,
}: {
	runtime: SettingsRuntime;
	children: ReactNode;
}) {
	return (
		<SettingsRuntimeContext.Provider value={runtime}>
			{children}
		</SettingsRuntimeContext.Provider>
	);
}

export function useSettingsRuntime(): SettingsRuntime {
	const runtime = useContext(SettingsRuntimeContext);
	if (!runtime) {
		throw new Error("SettingsRuntimeProvider is required");
	}
	return runtime;
}

export function useTranslation(): {
	t: TFunction;
	i18n: { language: Locale; changeLanguage: (locale: Locale) => void };
} {
	const runtime = useSettingsRuntime();
	return {
		t: runtime.t,
		i18n: {
			language: runtime.locale,
			changeLanguage: runtime.changeLanguage,
		},
	};
}

export const SUPPORTED_LOCALES = [
	{ code: "en", label: "English", nativeLabel: "English" },
	{ code: "zh", label: "Chinese", nativeLabel: "简体中文" },
] as const;

type Catalog = Record<string, unknown>;
const CATALOGS: Record<Locale, Catalog> = {
	en: en as Catalog,
	zh: zh as Catalog,
};
const PROVIDER_DISPLAY: Record<string, string> = {
	"forgeax-core": "ForgeaX Kernel",
	"claude-code": "the reference agent CLI",
	codex: "OpenAI Codex",
	"cursor-agent": "Cursor Agent",
	codebuddy: "a peer agent CLI",
	"kimi-code": "Kimi Code",
	"deepseek-harness": "DeepSeek Harness",
};
const DISPLAYABLE_KERNEL_CAPABILITIES = new Set([
	"streaming",
	"thinking",
	"toolCalls",
	"midTurnInject",
	"forkExtract",
]);
const PROVIDER_OVERRIDE_KEY = "forgeax.providerOverride";

type SettingsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): SettingsStorage | undefined {
	try {
		if (typeof localStorage === "undefined") return undefined;
		return localStorage;
	} catch {
		return undefined;
	}
}

export function loadStandaloneProviderOverride(
	storage: SettingsStorage | undefined = browserStorage(),
): string | null {
	try {
		const value = storage?.getItem(PROVIDER_OVERRIDE_KEY);
		return value && value !== "null" ? value : null;
	} catch {
		return null;
	}
}

export function saveStandaloneProviderOverride(
	value: string | null,
	storage: SettingsStorage | undefined = browserStorage(),
): void {
	try {
		if (value === null) storage?.removeItem(PROVIDER_OVERRIDE_KEY);
		else storage?.setItem(PROVIDER_OVERRIDE_KEY, value);
	} catch {
		// Private browsing and storage denial must not block Settings.
	}
}

export function syncStandaloneDocumentLanguage(
	locale: Locale,
	root: Pick<HTMLElement, "lang"> | undefined = typeof document === "undefined"
		? undefined
		: document.documentElement,
): void {
	if (root) root.lang = locale;
}

function resolve(catalog: Catalog, key: string): string | undefined {
	const flat = catalog[key];
	if (typeof flat === "string") return flat;
	let node: unknown = catalog;
	for (const part of key.split(".")) {
		if (!node || typeof node !== "object" || !(part in node)) return undefined;
		node = (node as Record<string, unknown>)[part];
	}
	return typeof node === "string" ? node : undefined;
}

function translate(
	locale: Locale,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const template =
		resolve(CATALOGS[locale], key) ??
		(locale === "en" ? undefined : resolve(CATALOGS.en, key)) ??
		key;
	if (!vars) return template;
	return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (match, name: string) =>
		name in vars ? String(vars[name]) : match,
	);
}

function deriveActiveSource(
	providerOverride: string | null,
	forgeaxModel: string | null,
): ActiveSourceId {
	if (providerOverride && providerOverride !== "forgeax")
		return providerOverride;
	return (forgeaxModel ?? "").trim() ? "api-key" : null;
}

export function pendingCliProviders(): RuntimeProviderRow[] {
	return Object.entries(PROVIDER_DISPLAY).map(([id, displayName]) => ({
		id,
		displayName,
		health: { ok: false, pending: true },
		capabilities: {},
	}));
}

async function fetchCliProviders(): Promise<{
	providers: RuntimeProviderRow[];
	cachedAt: number;
}> {
	const response = await fetch("/api/cli/health", {
		signal: AbortSignal.timeout(15_000),
	});
	if (!response.ok) throw new Error(`/api/cli/health ${response.status}`);
	const body = (await response.json()) as {
		providers?: Array<{
			id: string;
			ok?: boolean;
			detail?: string;
			capabilities?: Record<string, boolean>;
		}>;
	};
	return {
		providers: (body.providers ?? []).map((provider) => ({
			id: provider.id,
			displayName: PROVIDER_DISPLAY[provider.id] ?? provider.id,
			health: { ok: !!provider.ok, detail: provider.detail },
			capabilities: Object.fromEntries(
				Object.entries(provider.capabilities ?? {}).filter(([key]) =>
					DISPLAYABLE_KERNEL_CAPABILITIES.has(key),
				),
			),
		})),
		cachedAt: Date.now(),
	};
}

async function listSharedCapabilities(): Promise<SharedCapabilityListResponse> {
	const empty: SharedCapabilityListResponse = {
		generation: 0,
		loadedAt: 0,
		capabilities: [],
		issues: [],
	};
	const response = await fetch("/api/extensions/capabilities");
	if (
		!response.ok ||
		!response.headers.get("content-type")?.includes("application/json")
	) {
		return empty;
	}
	return (await response.json()) as SharedCapabilityListResponse;
}

async function patchModelRoute(
	source: ModelSource,
	setProviderOverride: (value: string | null) => void,
): Promise<void> {
	if (source.kind === "cli") {
		setProviderOverride(source.providerId);
		return;
	}
	const response = await fetch("/api/settings/env", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ FORGEAX_MODEL: source.model }),
	});
	const body = (await response.json().catch(() => null)) as {
		ok?: boolean;
		error?: string;
	} | null;
	if (!response.ok || !body?.ok) {
		throw new Error(body?.error ?? `HTTP ${response.status}`);
	}
	setProviderOverride(null);
}

function persistedLocale(): Locale {
	if (typeof window === "undefined") return "en";
	try {
		return window.localStorage.getItem("forgeax.locale") === "zh" ? "zh" : "en";
	} catch {
		return "en";
	}
}

export interface CreateSettingsRuntimeOptions {
	locale: Locale;
	changeLanguage: (locale: Locale) => void;
	providerOverride: string | null;
	applyModelRoute: (source: ModelSource) => Promise<void>;
	buildShortcuts?: () => ShortcutDef[];
	refreshAllModelCatalogs?: () => Promise<void>;
	resetOpenSessionsModelToProviderDefault?: SettingsRuntime["resetOpenSessionsModelToProviderDefault"];
}

/** Shared runtime factory for standalone dev and Studio product assembly. */
export function createSettingsRuntime(
	options: CreateSettingsRuntimeOptions,
): SettingsRuntime {
	return {
		t: (key, vars) => translate(options.locale, key, vars),
		locale: options.locale,
		changeLanguage: options.changeLanguage,
		providerOverride: options.providerOverride,
		buildShortcuts: options.buildShortcuts ?? (() => []),
		fetchCliProviders,
		listSharedCapabilities,
		refreshAllModelCatalogs:
			options.refreshAllModelCatalogs ?? (async () => undefined),
		deriveActiveSource,
		currentCatalogProvider: (override) =>
			override && override !== "forgeax" ? override : null,
		resetOpenSessionsModelToProviderDefault:
			options.resetOpenSessionsModelToProviderDefault ?? (async () => null),
		applyModelRoute: options.applyModelRoute,
	};
}

/** Runtime used only by the package's standalone development application. */
export function StandaloneSettingsRuntimeProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [locale, setLocale] = useState<Locale>(persistedLocale);
	const [providerOverride, setProviderOverride] = useState<string | null>(
		loadStandaloneProviderOverride,
	);
	useEffect(() => {
		syncStandaloneDocumentLanguage(locale);
	}, [locale]);
	const runtime = useMemo<SettingsRuntime>(
		() =>
			createSettingsRuntime({
				locale,
				changeLanguage(next) {
					setLocale(next);
					try {
						window.localStorage.setItem("forgeax.locale", next);
					} catch {
						// Private browsing and storage denial must not block Settings.
					}
				},
				providerOverride,
				applyModelRoute: (source) =>
					patchModelRoute(source, (next) => {
						saveStandaloneProviderOverride(next);
						setProviderOverride(next);
					}),
			}),
		[locale, providerOverride],
	);

	return (
		<SettingsRuntimeProvider runtime={runtime}>
			{children}
		</SettingsRuntimeProvider>
	);
}
