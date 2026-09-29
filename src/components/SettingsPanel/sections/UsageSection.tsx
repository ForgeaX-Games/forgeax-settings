import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCompactCount } from "../../../lib/format-compact-count";
import { useTranslation } from "../../../runtime";
import { Section } from "../../SettingsPrimitives";

interface UsageRow {
	calls: number;
	inputTokens: number;
	outputTokens: number;
}
interface UsageReport {
	totals: UsageRow;
	byModel: Array<UsageRow & { model: string }>;
	byDay: Array<UsageRow & { day: string }>;
	sourcedFrom: { sessionsScanned: number; eventsScanned: number };
}

function UsageStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="usage-stat">
			<div className="usage-stat-label">{label}</div>
			<div className="usage-stat-value">{value}</div>
		</div>
	);
}

export function UsageSection() {
	const { t } = useTranslation();
	const [report, setReport] = useState<UsageReport | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const lastGood = useRef<UsageReport | null>(null);

	const load = useCallback(async (opts?: { keepLast?: boolean }) => {
		if (!opts?.keepLast) {
			setReport(null);
			setErr(null);
		} else {
			setRefreshing(true);
		}
		try {
			const r = await fetch("/api/usage");
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const d = (await r.json()) as UsageReport;
			lastGood.current = d;
			setReport(d);
			setErr(null);
		} catch (e) {
			if (!opts?.keepLast) setErr((e as Error).message);
		} finally {
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	if (err && !report) {
		return (
			<Section
				icon={<RefreshCw size={14} />}
				title={t("settings.usage.title")}
				hint={t("settings.usage.hint")}
			>
				<div className="settings-info settings-error">
					{t("settings.readFailed", { error: err })}
				</div>
			</Section>
		);
	}

	if (!report) {
		return (
			<Section
				icon={<RefreshCw size={14} />}
				title={t("settings.usage.title")}
				hint={t("settings.usage.hint")}
			>
				<div className="settings-info dim">{t("common.loading")}</div>
			</Section>
		);
	}

	const { totals, byModel, byDay, sourcedFrom } = report;

	return (
		<Section
			icon={<RefreshCw size={14} />}
			title={t("settings.usage.title")}
			hint={t("settings.usage.hint")}
		>
			<button
				type="button"
				className="settings-secondary-btn usage-refresh-btn"
				onClick={() => void load({ keepLast: true })}
				disabled={refreshing}
			>
				<RefreshCw size={12} /> {t("settings.refresh")}
			</button>
			<div className="usage-panel">
				<div className="usage-stats-row">
					<UsageStat
						label={t("settings.usage.totalCalls")}
						value={String(totals.calls)}
					/>
					<UsageStat
						label={t("settings.usage.inputTokens")}
						value={formatCompactCount(totals.inputTokens)}
					/>
					<UsageStat
						label={t("settings.usage.outputTokens")}
						value={formatCompactCount(totals.outputTokens)}
					/>
					<UsageStat
						label={t("settings.usage.sessions")}
						value={String(sourcedFrom.sessionsScanned)}
					/>
				</div>

				<div className="usage-table-block">
					<div className="usage-table-head">
						<div className="usage-table-title">
							{t("settings.usage.byModel")}
						</div>
						<div className="usage-metrics usage-metrics-head">
							<span>{t("settings.usage.calls")}</span>
							<span>{t("settings.usage.input")}</span>
							<span>{t("settings.usage.output")}</span>
						</div>
					</div>
					{byModel.length === 0 ? (
						<div className="dim usage-empty">{t("settings.usage.noData")}</div>
					) : (
						<div className="usage-table-body">
							{byModel.map((row) => (
								<div key={row.model} className="usage-table-row">
									<div className="usage-table-model">{row.model}</div>
									<span className="usage-metrics">
										<span className="usage-metric-value">{row.calls}</span>
										<span className="usage-metric-value">
											{formatCompactCount(row.inputTokens)}
										</span>
										<span className="usage-metric-value">
											{formatCompactCount(row.outputTokens)}
										</span>
									</span>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="usage-table-block">
					<div className="usage-table-head">
						<div className="usage-table-title">{t("settings.usage.byDay")}</div>
						<div className="usage-metrics usage-metrics-head">
							<span>{t("settings.usage.calls")}</span>
							<span>{t("settings.usage.input")}</span>
							<span>{t("settings.usage.output")}</span>
						</div>
					</div>
					{byDay.length === 0 ? (
						<div className="dim usage-empty">—</div>
					) : (
						<div className="usage-table-body usage-day-body">
							{byDay.slice(-14).map((row) => (
								<div key={row.day} className="usage-day-row">
									<span className="usage-day-label">{row.day}</span>
									<span className="usage-metrics">
										<span className="usage-metric-value">{row.calls}</span>
										<span className="usage-metric-value">
											{formatCompactCount(row.inputTokens)}
										</span>
										<span className="usage-metric-value">
											{formatCompactCount(row.outputTokens)}
										</span>
									</span>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="usage-footnote">
					{t("settings.usage.scanned", {
						events: sourcedFrom.eventsScanned,
						sessions: sourcedFrom.sessionsScanned,
					})}
				</div>
				{err && (
					<div className="settings-error usage-refresh-error">
						{t("settings.readFailed", { error: err })}
					</div>
				)}
			</div>
		</Section>
	);
}
