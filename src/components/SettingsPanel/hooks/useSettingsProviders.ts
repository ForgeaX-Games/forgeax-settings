import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ActiveSourceId,
	type ModelSource,
	pendingCliProviders,
	useSettingsRuntime,
	useTranslation,
} from "../../../runtime";

export interface ProviderRow {
	id: string;
	displayName: string;
	capabilities: Record<string, boolean>;
	health: { ok: boolean; detail?: string; pending?: boolean };
}

export interface ProviderTestResult {
	status: "running" | "ok" | "err";
	totalMs?: number;
	ttftMs?: number;
	sawTool?: boolean;
	err?: string;
	ranAt?: number;
}

const NATIVE_KERNEL_IDS = new Set(["forgeax-core", "forgeax"]);

export function useSettingsProviders(
	flash: (kind: "ok" | "err", text: string) => void,
	reloadEnv: () => Promise<void>,
	envOf: (k: string) => string | null,
	setBusy: (busy: boolean) => void,
) {
	const runtime = useSettingsRuntime();
	const { t } = useTranslation();
	const [providers, setProviders] = useState<ProviderRow[]>(() =>
		pendingCliProviders().filter((row) => !NATIVE_KERNEL_IDS.has(row.id)),
	);
	const [nativeProvider, setNativeProvider] = useState<ProviderRow | null>(
		null,
	);
	const [providersCachedAt, setProvidersCachedAt] = useState<number | null>(
		null,
	);
	const [tests, setTests] = useState<Record<string, ProviderTestResult>>({});
	const inFlightTests = useRef<Set<AbortController>>(new Set());
	const reloadInFlight = useRef<Promise<void> | null>(null);
	const providerOverride = runtime.providerOverride;

	useEffect(() => {
		return () => {
			for (const ac of inFlightTests.current) {
				try {
					ac.abort();
				} catch {
					/* */
				}
			}
			inFlightTests.current.clear();
		};
	}, []);

	const reloadProviders = useCallback(
		async (force = false) => {
			if (reloadInFlight.current) return reloadInFlight.current;
			const p = (async () => {
				try {
					const { providers: rows, cachedAt } =
						await runtime.fetchCliProviders(force);
					const native =
						rows.find((row) => NATIVE_KERNEL_IDS.has(row.id)) ?? null;
					const cliOnly = rows.filter((row) => !NATIVE_KERNEL_IDS.has(row.id));
					setNativeProvider(native as unknown as ProviderRow | null);
					setProviders(cliOnly as unknown as ProviderRow[]);
					setProvidersCachedAt(cachedAt);
				} catch (error) {
					const detail = error instanceof Error ? error.message : String(error);
					setProviders((rows) =>
						rows.map((row) =>
							row.health.pending
								? { ...row, health: { ok: false, detail } }
								: row,
						),
					);
				}
			})();
			reloadInFlight.current = p;
			try {
				await p;
			} finally {
				reloadInFlight.current = null;
			}
		},
		[runtime],
	);

	useEffect(() => {
		void reloadProviders();
	}, [reloadProviders]);

	const testProvider = useCallback(async (id: string) => {
		setTests((prev) => ({ ...prev, [id]: { status: "running" } }));
		const started = performance.now();
		let ttft: number | undefined;
		const ac = new AbortController();
		inFlightTests.current.add(ac);
		const timer = setTimeout(() => ac.abort(), 30_000);
		try {
			const res = await fetch("/api/cli/chat", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					agentId: "forgeax",
					message: "respond with the single word: ok",
					providerOverride: id,
				}),
				signal: ac.signal,
			});
			if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			let buf = "";
			let errText: string | undefined;
			let sawTool = false;
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buf += dec.decode(value, { stream: true });
				if (ttft === undefined && /event: token/.test(buf))
					ttft = performance.now() - started;
				if (!sawTool && /event: tool-call/.test(buf)) sawTool = true;
				if (errText === undefined) {
					const errMatch = buf.match(/event: error[\s\S]*?\n\n/);
					if (errMatch) {
						const dat = errMatch[0].match(/data: (.+)/)?.[1];
						try {
							errText = JSON.parse(dat!).message;
						} catch {
							errText = dat;
						}
					}
				}
			}
			const total = performance.now() - started;
			const ranAt = Date.now();
			if (errText)
				setTests((prev) => ({
					...prev,
					[id]: { status: "err", totalMs: total, err: errText, ranAt },
				}));
			else
				setTests((prev) => ({
					...prev,
					[id]: { status: "ok", totalMs: total, ttftMs: ttft, sawTool, ranAt },
				}));
		} catch (e) {
			const errName = (e as Error).name;
			const errMsg =
				errName === "AbortError" ? "timed out after 30s" : (e as Error).message;
			setTests((prev) => ({
				...prev,
				[id]: { status: "err", err: errMsg, ranAt: Date.now() },
			}));
		} finally {
			clearTimeout(timer);
			inFlightTests.current.delete(ac);
		}
	}, []);

	const activeSource: ActiveSourceId = runtime.deriveActiveSource(
		providerOverride,
		envOf("FORGEAX_MODEL"),
	);

	const useModelSource = useCallback(
		async (source: ModelSource, label: string) => {
			setBusy(true);
			try {
				const prevCatalog = runtime.currentCatalogProvider(providerOverride);
				let route = source;
				if (source.kind === "cli" && source.providerId !== prevCatalog) {
					await runtime.resetOpenSessionsModelToProviderDefault(
						source.providerId,
					);
				} else if (source.kind === "api-key" && prevCatalog !== null) {
					const res =
						await runtime.resetOpenSessionsModelToProviderDefault(null);
					if (res?.selected) route = { kind: "api-key", model: res.selected };
				}
				await runtime.applyModelRoute(route);
				await reloadEnv();
				flash("ok", t("settings.providers.switched", { source: label }));
			} catch (e) {
				flash("err", (e as Error).message);
			} finally {
				setBusy(false);
			}
		},
		[flash, providerOverride, reloadEnv, runtime, setBusy, t],
	);

	return {
		providers,
		nativeProvider,
		providersCachedAt,
		tests,
		activeSource,
		reloadProviders,
		testProvider,
		useModelSource,
	};
}
