import { Command } from "lucide-react";
import { useMemo, useState } from "react";
import {
	type ShortcutDef,
	useSettingsRuntime,
	useTranslation,
} from "../../../runtime";
import { Section } from "../../SettingsPrimitives";
import { comboDisplayParts } from "../combo-display-parts";
import { useSettingsSection } from "../store";

const GROUP_LABEL: Record<ShortcutDef["group"], string> = {
	layout: "settings.shortcuts.groups.layout",
	mode: "settings.shortcuts.groups.mode",
	edit: "settings.shortcuts.groups.edit",
	overlay: "settings.shortcuts.groups.overlay",
	focus: "settings.shortcuts.groups.focus",
	general: "settings.shortcuts.groups.general",
};

const GROUP_ORDER: Array<ShortcutDef["group"]> = [
	"layout",
	"overlay",
	"mode",
	"edit",
	"focus",
	"general",
];

type ShortcutPlatform = "mac" | "windows";

function ComboBadge({
	combo,
	platform,
}: {
	combo: string;
	platform: ShortcutPlatform;
}) {
	const parts = comboDisplayParts(combo, platform);
	const title = parts.join(" + ");
	return (
		<span className="settings-combo-badge">
			{parts.map((p) => (
				<kbd key={p} className="settings-combo-key" title={title}>
					{p}
				</kbd>
			))}
		</span>
	);
}

function ShortcutsBody({ platform }: { platform: ShortcutPlatform }) {
	const runtime = useSettingsRuntime();
	const { t } = useTranslation();
	const shortcuts = useMemo(() => runtime.buildShortcuts(), [runtime]);
	const grouped = useMemo(() => {
		const out = new Map<ShortcutDef["group"], ShortcutDef[]>();
		for (const s of shortcuts) {
			if (!out.has(s.group)) out.set(s.group, []);
			out.get(s.group)!.push(s);
		}
		return out;
	}, [shortcuts]);

	return (
		<Section
			icon={<Command size={14} />}
			title={t("settings.shortcuts.title")}
			hint={t("settings.shortcuts.hint")}
		>
			<p className="settings-shortcuts-intro dim">
				{t("settings.shortcuts.introBlenderPrefix")}{" "}
				{t("settings.shortcuts.introBlenderSuffix")}{" "}
				<strong>{t("settings.shortcuts.introImeSafe")}</strong>
				{t("settings.shortcuts.introImePrefix")}
				{t("settings.shortcuts.introImeSuffix")}{" "}
				{t("settings.shortcuts.introReadonlyPrefix")}
				{t("settings.shortcuts.introReadonlySuffix")}
			</p>
			<div className="settings-shortcuts">
				{GROUP_ORDER.map((g) => {
					const list = grouped.get(g);
					if (!list || list.length === 0) return null;
					return (
						<div key={g} className="settings-shortcuts-group">
							<div className="settings-shortcuts-group-label">
								{t(GROUP_LABEL[g])}
							</div>
							<table className="settings-shortcuts-table">
								<tbody>
									{list.map((s) => (
										<tr key={s.combo}>
											<td className="settings-shortcuts-combo">
												<ComboBadge combo={s.combo} platform={platform} />
											</td>
											<td className="settings-shortcuts-label">{s.label}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					);
				})}
			</div>
		</Section>
	);
}

export function ShortcutsSectionRegister() {
	const runtime = useSettingsRuntime();
	const { t } = useTranslation();
	const [platform, setPlatform] = useState<ShortcutPlatform>(() => {
		const p =
			(navigator as Navigator & { userAgentData?: { platform?: string } })
				.userAgentData?.platform ??
			navigator.platform ??
			"";
		return /Mac|iPhone|iPad|iPod/i.test(p) ||
			/Mac OS X/i.test(navigator.userAgent)
			? "mac"
			: "windows";
	});

	const headerActions = useMemo(
		() => (
			<div
				className="settings-shortcuts-os sc-os-toggle"
				role="tablist"
				aria-label={t("settings.shortcuts.platformAria")}
			>
				<button
					type="button"
					role="tab"
					aria-selected={platform === "mac"}
					className={`settings-shortcuts-os-btn ${platform === "mac" ? "is-active" : ""}`}
					onClick={() => setPlatform("mac")}
				>
					{t("settings.shortcuts.platformMac")}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={platform === "windows"}
					className={`settings-shortcuts-os-btn ${platform === "windows" ? "is-active" : ""}`}
					onClick={() => setPlatform("windows")}
				>
					{t("settings.shortcuts.platformWin")}
				</button>
			</div>
		),
		[platform, t],
	);

	const node = useMemo(() => <ShortcutsBody platform={platform} />, [platform]);
	const enabled = useMemo(() => runtime.buildShortcuts().length > 0, [runtime]);

	useSettingsSection({
		id: "shortcuts",
		label: t("settings.shortcuts.title"),
		priority: 50,
		group: "system",
		icon: Command,
		headerActions,
		node,
		enabled,
	});

	return null;
}
