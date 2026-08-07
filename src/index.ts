// @forgeax/settings — public entry for the standalone settings application.
//
// The unified settings overlay (sections registry + built-in sections). The
// shell overlay slot still lives in @forgeax/interface as generic
// activeOverlay/overlayParam state; settings sections, prefs, and product
// content are owned here and injected by studio.
// Studio product assembly injects it via the interface `renderSettings` slot
// (which mounts both the sections register side-effect and the panel); the
// interface foundation never
// imports this package.
export { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
export { SettingsSectionsRegister } from './components/SettingsPanel/SectionsRegister';
// Registry hook — the documented way for ANY feature to drop a section into
// the overlay without editing SettingsPanel.tsx (aggregation layers like
// studio's editorRenderers use it to project their own sections in).
export { useSettingsSection } from './components/SettingsPanel/store';
export type { SettingsSection, SettingsGroup } from './components/SettingsPanel/store';
// ① agent 安装偏好（R5）—— owner 在 settings，走 bus 'prefs:agents'。boot 时由聚合方调 initAgentPrefs()。
export {
  initAgentPrefs,
  useAgentPrefs,
  toggleAgentInstalled,
  setAgentInstalled,
  setDefaultBootstrapAgent,
  requestAgentSeed,
  peekAgentPrefs,
  AGENT_PREFS_TOPIC,
  type AgentPrefsSnapshot,
} from './agent-prefs';
