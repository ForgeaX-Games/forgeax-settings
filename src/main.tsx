// Standalone settings app entry — OWNS its own boot, mirroring
// packages/editor/standalone/main.tsx. interface is consumed purely as a parts
// library; the IDE product shell (<App>) is studio's (L3) concern and is NOT
// rendered here. Mounts BOTH the sections-register side-effect and the panel,
// like studio, full-viewport over the booted L1 store.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@forgeax/interface/styles/global.css';
import { applyTheme } from '@forgeax/design/theme';
import { initI18n } from '@forgeax/interface/i18n';
import { initAegis } from '@forgeax/interface/lib/aegis';
import { BrandProvider } from '@forgeax/interface/brand';
import { ErrorBoundary } from '@forgeax/interface/components/ErrorBoundary';
import { bootStageEntry } from '@forgeax/interface/boot/driver';
import { bootBroadcast } from '@forgeax/interface/boot/broadcast';
import { subscribeNarrativeCopilot } from '@forgeax/interface/lib/narrative-copilot';
import { subscribeFileActivityStream } from '@forgeax/interface/lib/file-activity-stream';
import { subscribePermissionStream } from '@forgeax/interface/lib/permission-stream';
import { subscribePerceptionStream } from '@forgeax/interface/lib/perception-stream';
import { syncBrowserPrefsFromServer, startBrowserPrefsSync } from '@forgeax/interface/lib/browser-prefs-sync';
import { useShellStore } from '@forgeax/interface/store';
import { installHealthBridge } from '@forgeax/interface/components/StatusBar/healthBridge';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { SettingsSectionsRegister } from './components/SettingsPanel/SectionsRegister';
import { initAgentPrefs } from './agent-prefs';

const SHELL_CSS = `
.forgeax-standalone-shell { position: fixed; inset: 0; display: flex; overflow: hidden; background: var(--color-background, #0e1216); }
.forgeax-standalone-shell > * { flex: 1 1 auto; min-width: 0; min-height: 0; }
`;

function boot(): void {
  applyTheme('dark');
  initI18n();
  initAegis();

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root missing');

  void syncBrowserPrefsFromServer().finally(() => {
    initI18n();
    startBrowserPrefsSync();
  });
  bootStageEntry();

  installHealthBridge();
  initAgentPrefs(); // ① agent 安装偏好 owner —— 发首帧 bus 快照 + 挂 seed 监听
  bootBroadcast(); // R5/P1 唯一公共广播 socket（telemetry / workspace-changed）
  subscribeNarrativeCopilot();
  subscribeFileActivityStream();
  subscribePermissionStream();
  subscribePerceptionStream();
  // SettingsPanel renders as an overlay keyed off activeOverlay==='settings' —
  // open it so the standalone page lands on its own surface.
  useShellStore.getState().openOverlay('settings');
  void useShellStore.getState().initSessions();

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>)['__dev'] = useShellStore;
  }
  (window as unknown as { __forgeaxBoot?: { done?: () => void } }).__forgeaxBoot?.done?.();

  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary scope="settings-standalone">
        <BrandProvider>
          <style>{SHELL_CSS}</style>
          <div className="forgeax-standalone-shell studio-shell studio-shell--preview-skin">
            <SettingsSectionsRegister />
            <SettingsPanel />
          </div>
        </BrandProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

boot();
