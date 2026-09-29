import { History, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "../../../runtime";
import { Section } from "../../SettingsPrimitives";
import type { SettingsData } from "../hooks/useSettingsEnv";
import { MdLite } from "../shared/settings-content";

interface VersionInfo {
	version: string;
	sha: string;
	date: string;
	totalCommits: number;
	branch: string;
}

interface ChangelogEntry {
	version: string;
	date: string;
	title: string;
	delta?: string;
	theme?: string;
	body: string;
}

export function AboutSection({ data }: { data: SettingsData | null }) {
	const { t } = useTranslation();
	const [info, setInfo] = useState<VersionInfo | null>(null);
	const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
	const [changelogErr, setChangelogErr] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/version")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => {
				if (!cancelled && d) setInfo(d as VersionInfo);
			})
			.catch(() => {
				/* offline */
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/changelog")
			.then((r) =>
				r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
			)
			.then((d: { entries: ChangelogEntry[]; error?: string }) => {
				if (cancelled) return;
				if (d.error) setChangelogErr(d.error);
				setEntries(d.entries ?? []);
			})
			.catch((e: Error) => {
				if (!cancelled) setChangelogErr(e.message);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="settings-about">
			<Section
				icon={<Info size={14} />}
				title={t("settings.about.productName")}
				hint={t("settings.about.hint")}
			>
				<div className="settings-info">
					<div className="about-path-row">
						<span className="dim">{t("settings.about.versionLabel")}</span>
						<code className="about-path-value settings-about-version">
							{info?.version ?? t("settings.about.connecting")}
						</code>
					</div>
					<div className="about-path-row">
						<span className="dim">{t("settings.about.commitLabel")}</span>
						<span className="about-meta-value">
							<code>{info?.sha ?? "?"}</code>
							<span>{info?.date ?? "?"}</span>
							<code>{info?.branch ?? "?"}</code>
						</span>
					</div>
					<div className="about-path-row">
						<span className="dim">{t("settings.about.totalCommits")}</span>
						<code className="about-path-value">
							{info?.totalCommits ?? 0} ({t("settings.about.mainBranch")})
						</code>
					</div>
					<div className="about-path-row settings-about-repo">
						<span className="dim">{t("settings.about.repoLabel")}</span>
						<a
							className="about-path-value"
							href="https://github.com/ForgeaX-Games/forgeax-studio"
							target="_blank"
							rel="noreferrer"
						>
							github.com/ForgeaX-Games/forgeax-studio
						</a>
					</div>
					<div className="about-path-row">
						<span className="dim">
							{t("settings.about.versionSchemeLabel")}
						</span>
						<span className="about-path-value settings-about-scheme">
							<code>v0.M.D.N</code> {t("settings.about.versionSchemeDetail")}
							{t("settings.about.versionSchemeSee")} <code>CHANGELOG.md</code> /{" "}
							<code>scripts/version.sh</code>
						</span>
					</div>
				</div>
			</Section>

			<Section
				icon={<Info size={14} />}
				title={t("settings.about.pathsTitle")}
				hint={t("settings.readonly")}
			>
				<div className="settings-info">
					<div className="about-path-row">
						<span className="dim">{t("settings.about.projectRoot")}</span>
						<code className="about-path-value">
							{data?.paths.projectRoot ?? "—"}
						</code>
					</div>
					<div className="about-path-row">
						<span className="dim">{t("settings.about.envFile")}</span>
						<code className="about-path-value">
							{data?.paths.envPath ?? "—"}
						</code>
					</div>
					<div className="about-path-row">
						<span className="dim">{t("settings.about.studioPorts")}</span>
						<code className="about-path-value">
							{data?.paths.studioPorts
								? t("settings.about.studioPortsValue", {
										ui: data.paths.studioPorts.ui,
										server: data.paths.studioPorts.server,
										engine: data.paths.studioPorts.engine,
									})
								: "—"}
						</code>
					</div>
				</div>
			</Section>

			<Section
				icon={<History size={14} />}
				title={t("settings.changelog.title")}
				hint={t("settings.changelog.hint")}
			>
				{entries === null && !changelogErr && (
					<div className="settings-info dim">{t("common.loading")}</div>
				)}
				{changelogErr && (
					<div className="settings-info settings-error">
						{t("settings.readFailed", { error: changelogErr })}
					</div>
				)}
				{entries && entries.length === 0 && (
					<div className="settings-info dim">
						{t("settings.changelog.empty")}
					</div>
				)}
				{entries && entries.length > 0 && (
					<div className="settings-changelog-list">
						{entries.map((e) => (
							<article key={e.version} className="settings-changelog-card">
								<header className="settings-changelog-head">
									<code className="settings-changelog-version">
										{e.version}
									</code>
									<span className="settings-changelog-date">{e.date}</span>
									<span className="settings-changelog-title">· {e.title}</span>
								</header>
								{e.delta && (
									<div className="settings-changelog-delta">
										<span>Δ</span> {e.delta}
									</div>
								)}
								{e.theme && (
									<div className="settings-changelog-theme">{e.theme}</div>
								)}
								<MdLite text={e.body} />
							</article>
						))}
					</div>
				)}
			</Section>
		</div>
	);
}
