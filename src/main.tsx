import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import "@forgeax/design/tokens.css";
import "@forgeax/design/styles/primitive.css";
import "@forgeax/design/styles/semantic.css";
import { applyTheme } from "@forgeax/design/theme";
import { initAgentPrefs } from "./agent-prefs";
import { SettingsSectionsRegister } from "./components/SettingsPanel/SectionsRegister";
import { SettingsPanel } from "./components/SettingsPanel/SettingsPanel";
import { StandaloneSettingsRuntimeProvider } from "./runtime";
import "./standalone.css";

function StandaloneSettingsApp() {
	const [open, setOpen] = useState(true);
	const [activeId, setActiveId] = useState<string | null>("providers");
	const onActiveIdChange = useCallback((id: string) => setActiveId(id), []);

	return (
		<StandaloneSettingsRuntimeProvider>
			<SettingsSectionsRegister
				activeId={activeId}
				onActiveIdChange={onActiveIdChange}
			/>
			<SettingsPanel
				open={open}
				activeId={activeId}
				onClose={() => setOpen(false)}
				onActiveIdChange={onActiveIdChange}
			/>
			{!open && (
				<button
					type="button"
					className="settings-standalone-reopen"
					onClick={() => setOpen(true)}
				>
					Open Settings
				</button>
			)}
		</StandaloneSettingsRuntimeProvider>
	);
}

function boot(): void {
	applyTheme("dark");
	initAgentPrefs();

	const rootElement = document.getElementById("root");
	if (!rootElement) throw new Error("#root missing");
	createRoot(rootElement).render(
		<StrictMode>
			<StandaloneSettingsApp />
		</StrictMode>,
	);
	window.__forgeaxBoot?.done?.();
}

boot();
