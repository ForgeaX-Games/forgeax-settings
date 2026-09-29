// @forgeax/settings — public entry for the standalone settings application.
//
// The unified settings overlay (sections registry + built-in sections). The
// shell overlay slot remains a generic product-shell concern
// activeOverlay/overlayParam state; settings sections, prefs, and product
// content are owned here and injected by studio.
// Studio product assembly injects it via the interface `renderSettings` slot
// (which mounts both the sections register side-effect and the panel); the
// interface foundation never
// imports this package.

// ① agent 安装偏好（R5）—— owner 在 settings，走 bus 'prefs:agents'。boot 时由聚合方调 initAgentPrefs()。
export {
	AGENT_PREFS_TOPIC,
	type AgentPrefsBus,
	type AgentPrefsSnapshot,
	initAgentPrefs,
	peekAgentPrefs,
	requestAgentSeed,
	setAgentInstalled,
	setDefaultBootstrapAgent,
	toggleAgentInstalled,
	useAgentPrefs,
} from "./agent-prefs";
export { SettingsSectionsRegister } from "./components/SettingsPanel/SectionsRegister";
export { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
export type {
	SettingsGroup,
	SettingsSection,
} from "./components/SettingsPanel/store";
// Registry hook — the documented way for ANY feature to drop a section into
// the overlay without editing SettingsPanel.tsx (aggregation layers like
// studio's editorRenderers use it to project their own sections in).
export { useSettingsSection } from "./components/SettingsPanel/store";
export {
	type ActiveSourceId,
	type CreateSettingsRuntimeOptions,
	createSettingsRuntime,
	type ModelSource,
	type SettingsRuntime,
	SettingsRuntimeProvider,
	type ShortcutDef,
	StandaloneSettingsRuntimeProvider,
} from "./runtime";
