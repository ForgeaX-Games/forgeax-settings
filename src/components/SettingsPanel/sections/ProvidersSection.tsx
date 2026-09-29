import { Cpu, Key, Plug, RefreshCw } from "lucide-react";
import { Fragment } from "react";
import {
	type ActiveSourceId,
	type ModelSource,
	useTranslation,
} from "../../../runtime";
import { EnvField, Section } from "../../SettingsPrimitives";
import { KernelCapabilitySummary } from "../CapabilityManagementPanel";
import { DshCredentialSettings } from "../DshCredentialSettings";
import type {
	ProviderRow,
	ProviderTestResult,
} from "../hooks/useSettingsProviders";
import { KernelMemoryToggle } from "../KernelMemoryToggle";
import { KernelPermissionSelect } from "../KernelPermissionSelect";
import { formatProviderTestResult } from "../shared/settings-content";
import { UseControl } from "../shared/UseControl";

export interface ProvidersSectionProps {
	dataLoaded: boolean;
	busy: boolean;
	envOf: (k: string) => string | null;
	patchEnv: (patch: Record<string, string>) => Promise<boolean>;
	providers: ProviderRow[] | null;
	nativeProvider: ProviderRow | null;
	providersCachedAt: number | null;
	tests: Record<string, ProviderTestResult>;
	activeSource: ActiveSourceId;
	reloadProviders: (force?: boolean) => Promise<void>;
	testProvider: (id: string) => Promise<void>;
	useModelSource: (source: ModelSource, label: string) => Promise<void>;
}

export function ProvidersSection({
	dataLoaded,
	busy,
	envOf,
	patchEnv,
	providers,
	nativeProvider,
	providersCachedAt,
	tests,
	activeSource,
	reloadProviders,
	testProvider,
	useModelSource: activateModelSource,
}: ProvidersSectionProps) {
	const { t } = useTranslation();

	if (!dataLoaded)
		return <div className="settings-loading">{t("common.loading")}</div>;

	const litellmKeyPresent = (envOf("LITELLM_PROXY_KEY") ?? "").length > 0;
	const litellmUrlPresent = (envOf("LITELLM_PROXY_BASE_URL") ?? "").length > 0;
	const currentModel = envOf("FORGEAX_MODEL") ?? "";
	const apiModel = currentModel || "gpt-4o-mini";
	const nativeCredPresent =
		(litellmKeyPresent && litellmUrlPresent) ||
		(envOf("ANTHROPIC_API_KEY") ?? "").length > 0 ||
		(envOf("ANTHROPIC_AUTH_TOKEN") ?? "").length > 0 ||
		(envOf("OPENAI_API_KEY") ?? "").length > 0 ||
		(envOf("GEMINI_API_KEY") ?? "").length > 0 ||
		(envOf("DEEPSEEK_API_KEY") ?? "").length > 0;
	const nativeEligible = nativeCredPresent || currentModel.length > 0;
	const nativeCaps = nativeProvider
		? Object.entries(nativeProvider.capabilities)
				.filter(([, v]) => v)
				.map(([k]) => k)
		: [];
	const nativeTest = tests["forgeax-core"];

	return (
		<div className="sp-providers">
			<Section
				icon={<Cpu size={14} />}
				title={t("settings.providers.native.title")}
				hint={t("settings.providers.native.hint")}
			>
				<div
					className={`settings-provider-row ${nativeProvider && !nativeProvider.health.ok ? "is-down" : ""}`}
				>
					<div className="settings-provider-head">
						<code className="settings-provider-id">
							{nativeProvider?.id ?? "forgeax-core"}
						</code>
						<span className="ok-pill">
							{t("settings.providers.native.badge")}
						</span>
						<KernelMemoryToggle
							kernelId={nativeProvider?.id ?? "forgeax-core"}
						/>
						<UseControl
							id="api-key"
							activeSource={activeSource}
							eligible={nativeEligible}
							reason={t("settings.providers.native.useReason")}
							onUse={() =>
								void activateModelSource(
									{ kind: "api-key", model: apiModel },
									t("settings.providers.native.title"),
								)
							}
							t={t}
							busy={busy}
						/>
						<KernelPermissionSelect
							kernelId={nativeProvider?.id ?? "forgeax-core"}
						/>
					</div>
					{nativeProvider?.health.detail && (
						<div className="settings-help" title={nativeProvider.health.detail}>
							{nativeProvider.health.detail}
						</div>
					)}
					{nativeCaps.length > 0 && (
						<div className="settings-provider-caps">
							{nativeCaps.map((c) => (
								<span key={c} className="settings-cap-chip">
									{c}
								</span>
							))}
						</div>
					)}
					<KernelCapabilitySummary kernelId="forgeax-core" />
					<div className="settings-provider-test">
						<button
							type="button"
							className="settings-edit-btn"
							onClick={() => {
								void reloadProviders(true);
								void testProvider("forgeax-core");
							}}
							disabled={nativeTest?.status === "running"}
						>
							{nativeTest?.status === "running"
								? t("settings.cliProviders.testing")
								: t("settings.providers.test")}
						</button>
						{nativeTest && nativeTest.status !== "running" && (
							<span
								className={`settings-test-result ${nativeTest.status === "ok" ? "is-ok" : "is-err"}`}
							>
								{formatProviderTestResult(nativeTest)}
							</span>
						)}
					</div>
				</div>
			</Section>

			<Section
				icon={<Key size={14} />}
				title={t("settings.providers.api.title")}
				hint={t("settings.providers.api.hint")}
			>
				<EnvField
					label="LITELLM_PROXY_BASE_URL"
					masked={envOf("LITELLM_PROXY_BASE_URL")}
					placeholder="https://your-litellm-host"
					onSave={(v) =>
						void patchEnv({ LITELLM_PROXY_BASE_URL: v, ANTHROPIC_BASE_URL: v })
					}
					busy={busy}
					visible
				/>
				<EnvField
					label="LITELLM_PROXY_KEY"
					masked={envOf("LITELLM_PROXY_KEY")}
					placeholder="sk-..."
					onSave={(v) =>
						void patchEnv({ LITELLM_PROXY_KEY: v, ANTHROPIC_API_KEY: v })
					}
					busy={busy}
				/>
			</Section>

			<Section
				icon={<Plug size={14} />}
				title={t("settings.providers.cli.title")}
				hint={t("settings.providers.cli.hint")}
			>
				{!providers && (
					<div className="settings-help">{t("common.loading")}</div>
				)}
				{providers && providers.length === 0 && (
					<div className="settings-help">{t("settings.cliProviders.none")}</div>
				)}
				{providers?.map((p) => {
					const caps = Object.entries(p.capabilities)
						.filter(([, v]) => v)
						.map(([k]) => k);
					const tr = tests[p.id];
					return (
						<Fragment key={p.id}>
							<div
								className={`settings-provider-row ${!p.health.ok && !p.health.pending ? "is-down" : ""}`}
							>
								<div className="settings-provider-head">
									<code className="settings-provider-id">{p.id}</code>
									<span className="settings-provider-name">
										{p.displayName}
									</span>
									<span
										className={
											p.health.pending
												? "settings-help"
												: p.health.ok
													? "ok-pill"
													: "err-pill"
										}
									>
										{p.health.pending
											? t("common.loading")
											: p.health.ok
												? t("settings.providers.cli.healthy")
												: t("settings.providers.cli.unavailable")}
									</span>
									<KernelMemoryToggle kernelId={p.id} />
									<UseControl
										id={p.id}
										activeSource={activeSource}
										eligible={p.health.ok}
										reason={t("settings.providers.cli.useReason")}
										onUse={() =>
											void activateModelSource(
												{ kind: "cli", providerId: p.id },
												p.displayName,
											)
										}
										t={t}
										busy={busy}
									/>
									<KernelPermissionSelect kernelId={p.id} />
								</div>
								{p.health.detail && (
									<div className="settings-help" title={p.health.detail}>
										{p.health.detail}
									</div>
								)}
								<div className="settings-provider-caps">
									{caps.map((c) => (
										<span key={c} className="settings-cap-chip">
											{c}
										</span>
									))}
								</div>
								<KernelCapabilitySummary kernelId={p.id} />
								<div className="settings-provider-test">
									<button
										type="button"
										className="settings-edit-btn"
										onClick={() => {
											void reloadProviders(true);
											void testProvider(p.id);
										}}
										disabled={p.health.pending || tr?.status === "running"}
									>
										{tr?.status === "running"
											? t("settings.cliProviders.testing")
											: t("settings.providers.test")}
									</button>
									{tr && tr.status !== "running" && (
										<span
											className={`settings-test-result ${tr.status === "ok" ? "is-ok" : "is-err"}`}
										>
											{formatProviderTestResult(tr)}
										</span>
									)}
								</div>
							</div>
							{p.id === "deepseek-harness" && (
								<DshCredentialSettings
									apiKey={envOf("DEEPSEEK_API_KEY")}
									baseUrl={envOf("DEEPSEEK_BASE_URL")}
									busy={busy}
									onSave={patchEnv}
								/>
							)}
						</Fragment>
					);
				})}
				<div className="settings-provider-actions">
					<button
						type="button"
						className="settings-edit-btn"
						onClick={() => void reloadProviders(true)}
						disabled={busy}
					>
						<RefreshCw size={11} /> {t("settings.refresh")}
					</button>
					{providersCachedAt && (
						<span className="settings-provider-snapshot-age">
							{t("settings.cliProviders.snapshotAge", {
								seconds: Math.round((Date.now() - providersCachedAt) / 1000),
							})}
						</span>
					)}
				</div>
			</Section>
		</div>
	);
}
