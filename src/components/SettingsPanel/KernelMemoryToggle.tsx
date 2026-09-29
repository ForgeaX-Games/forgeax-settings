/**
 * KernelMemoryToggle — per-kernel memory checkbox in Providers rows.
 * Shares one GET with all rows via module-level cache (same pattern as KernelPermissionSelect).
 */
import { type ReactNode, useEffect, useState } from "react";
import {
	notifyConfigChanged,
	onConfigChanged,
} from "../../config-invalidation";
import { useTranslation } from "../../runtime";

interface KernelCap {
	id: string;
	cacheWarmCapable: boolean;
}

interface Snapshot {
	master: boolean;
	perKernel: Record<string, boolean>;
	kernels: KernelCap[];
}

let snapshot: Snapshot | null = null;
let inflight: Promise<void> | null = null;
let loaded = false;
const subscribers = new Set<() => void>();

function emit(): void {
	for (const fn of subscribers) fn();
}

function load(force = false): Promise<void> {
	if (loaded && !force) return Promise.resolve();
	if (inflight) return inflight;

	inflight = (async () => {
		try {
			const r = await fetch("/api/memory-settings");
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const j = (await r.json()) as {
				config?: { master?: boolean; perKernel?: Record<string, boolean> };
				kernels?: KernelCap[];
			};
			snapshot = {
				master: !!j?.config?.master,
				perKernel: j?.config?.perKernel ?? {},
				kernels: Array.isArray(j?.kernels) ? j.kernels : [],
			};
			loaded = true;
			emit();
		} catch {
			snapshot = { master: true, perKernel: {}, kernels: [] };
			loaded = true;
			emit();
		} finally {
			inflight = null;
		}
	})();

	return inflight;
}

function perKernelEnabled(kernelId: string): boolean {
	if (!snapshot) return false;
	const cap = snapshot.kernels.find((k) => k.id === kernelId);
	return snapshot.perKernel[kernelId] ?? cap?.cacheWarmCapable ?? false;
}

async function save(kernelId: string, enabled: boolean): Promise<void> {
	const response = await fetch("/api/memory-settings", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ kernelId, enabled }),
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	await load(true);
	notifyConfigChanged("memory-settings");
}

export function KernelMemoryToggle({
	kernelId,
}: {
	kernelId: string;
}): ReactNode {
	const { t } = useTranslation();
	const [, tick] = useState(0);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState(false);

	useEffect(() => {
		const sub = () => tick((n) => n + 1);
		subscribers.add(sub);
		void load().then(sub);
		const unsubscribe = onConfigChanged("memory-settings", () => {
			void load(true);
		});
		return () => {
			subscribers.delete(sub);
			unsubscribe();
		};
	}, []);

	if (!loaded || !snapshot) return null;
	const cap = snapshot.kernels.find((k) => k.id === kernelId);
	if (!cap) return null;

	const checked = snapshot.master && perKernelEnabled(kernelId);

	return (
		<label className="settings-memory-toggle">
			<input
				type="checkbox"
				checked={checked}
				disabled={!snapshot.master || saving}
				aria-invalid={saveError}
				aria-label={t("settings.memory.toggle")}
				onChange={() => {
					const on = perKernelEnabled(kernelId);
					setSaving(true);
					setSaveError(false);
					void save(kernelId, !on)
						.catch(() => setSaveError(true))
						.finally(() => setSaving(false));
				}}
			/>
			<span>{t("settings.memory.toggle")}</span>
		</label>
	);
}
