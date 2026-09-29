/** ① agent 安装偏好 —— 从 interface store 抽出的跨-app 共享只读真值（R5）。
 *
 *  归属：**settings 拥有写**（Settings→Agents 勾选）。chat / Agents app 只读。
 *  机制：**用宿主注入 bus 的 retained 快照当内存 SSOT**（`prefs:agents`），localStorage
 *  持久化，`PUT /api/prefs/uninstalled-agents` 镜像给服务端工具。这样：
 *   - interface store 不再认识 agent 概念；
 *   - 读者（chat / Agents app）零 import settings —— 只 `useBusSnapshot('prefs:agents')`；
 *   - 首跑 seed 通过 bus 命令 `prefs:seed` 触发（谁先 fetch 到 agent 列表谁发）。
 *
 *  standalone chat（没有 settings owner 初始化）→ 无人 publish → 读者拿默认（全装），
 *  可接受（独立 chat 也没有卸载 UI）。聚合 studio / 独立 settings 会在 boot 调 initAgentPrefs()。
 */

import { useSyncExternalStore } from "react";

export interface AgentPrefsSnapshot {
	uninstalledAgentIds: string[];
	defaultBootstrapAgent: string | null;
}

export const AGENT_PREFS_TOPIC = "prefs:agents";
export const AGENT_PREFS_SEED_TOPIC = "prefs:seed";

export interface AgentPrefsBus {
	publish(
		topic: string,
		payload: unknown,
		options?: { retain?: boolean },
	): void;
	peek(topic: string): unknown;
	subscribe(topic: string, listener: (payload: unknown) => void): () => void;
}

const localTopics = new Map<string, unknown>();
const localListeners = new Map<string, Set<(payload: unknown) => void>>();
const localBus: AgentPrefsBus = {
	publish(topic, payload, options) {
		if (options?.retain) localTopics.set(topic, payload);
		for (const listener of localListeners.get(topic) ?? []) listener(payload);
	},
	peek: (topic) => localTopics.get(topic),
	subscribe(topic, listener) {
		const listeners = localListeners.get(topic) ?? new Set();
		listeners.add(listener);
		localListeners.set(topic, listeners);
		return () => listeners.delete(listener);
	},
};
let prefsBus: AgentPrefsBus = localBus;
const snapshotListeners = new Set<() => void>();

/** 默认安装：forge(main,不可卸载) + mochi + iori + suzu + rin；其余首跑默认卸载。 */
const DEFAULT_INSTALLED_AGENT_IDS = ["forge", "mochi", "iori", "suzu", "rin"];
const UNINSTALLED_KEY = "forgeax.uninstalledAgents";
const INITIALIZED_KEY = "forgeax.uninstalledAgents.initialized";
const BOOTSTRAP_KEY = "forgeax.defaultBootstrapAgent";

function loadUninstalled(): string[] {
	try {
		const raw = localStorage.getItem(UNINSTALLED_KEY);
		if (!raw) return [];
		const arr = JSON.parse(raw) as unknown;
		if (!Array.isArray(arr)) return [];
		return arr.filter(
			(v): v is string => typeof v === "string" && v.length > 0,
		);
	} catch {
		return [];
	}
}
function saveUninstalled(ids: string[]): void {
	try {
		if (ids.length === 0) localStorage.removeItem(UNINSTALLED_KEY);
		else localStorage.setItem(UNINSTALLED_KEY, JSON.stringify(ids));
	} catch {
		/* ignore */
	}
}
function loadBootstrap(): string | null {
	try {
		const v = localStorage.getItem(BOOTSTRAP_KEY);
		return v && v.trim() ? v : null;
	} catch {
		return null;
	}
}
function saveBootstrap(id: string | null): void {
	try {
		if (id) localStorage.setItem(BOOTSTRAP_KEY, id);
		else localStorage.removeItem(BOOTSTRAP_KEY);
	} catch {
		/* ignore */
	}
}
async function pushToServer(ids: string[]): Promise<void> {
	try {
		await fetch("/api/prefs/uninstalled-agents", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ids }),
		});
	} catch {
		/* server prefs are advisory — mirror, never SSOT */
	}
}

function snapshot(): AgentPrefsSnapshot {
	return {
		uninstalledAgentIds: loadUninstalled(),
		defaultBootstrapAgent: loadBootstrap(),
	};
}
/** 把当前 localStorage 真值发成 retained 快照 —— 读者随之重渲染。 */
function publishSnapshot(): void {
	currentSnapshot = snapshot();
	prefsBus.publish(AGENT_PREFS_TOPIC, currentSnapshot, { retain: true });
	for (const listener of snapshotListeners) listener();
}

/** 读非-React 语境的当前快照（如 chat 建 session 时取 defaultBootstrapAgent）。 */
export function peekAgentPrefs(): AgentPrefsSnapshot {
	return (
		(prefsBus.peek(AGENT_PREFS_TOPIC) as AgentPrefsSnapshot | undefined) ??
		(currentSnapshot === EMPTY ? snapshot() : currentSnapshot)
	);
}

export function toggleAgentInstalled(id: string): void {
	if (!id) return;
	const cur = loadUninstalled();
	const next = cur.includes(id)
		? cur.filter((x) => x !== id)
		: [...cur, id].sort();
	saveUninstalled(next);
	void pushToServer(next);
	publishSnapshot();
}
export function setAgentInstalled(id: string, installed: boolean): void {
	if (!id) return;
	const cur = loadUninstalled();
	const has = cur.includes(id);
	if (installed && !has) return;
	if (!installed && has) return;
	const next = installed ? cur.filter((x) => x !== id) : [...cur, id].sort();
	saveUninstalled(next);
	void pushToServer(next);
	publishSnapshot();
}
export function setDefaultBootstrapAgent(id: string | null): void {
	saveBootstrap(id);
	publishSnapshot();
}

/** 首跑 seed：INITIALIZED_KEY 缺 → 把非默认 agent 全部预卸载。幂等。 */
export function seedFromAgentList(allIds: string[], mainId?: string): void {
	if (typeof window === "undefined") return;
	try {
		if (localStorage.getItem(INITIALIZED_KEY)) return;
	} catch {
		return;
	}
	const installable = new Set(DEFAULT_INSTALLED_AGENT_IDS);
	if (mainId) installable.add(mainId);
	const uninstalled = allIds.filter((id) => !installable.has(id)).sort();
	try {
		localStorage.setItem(INITIALIZED_KEY, "1");
	} catch {
		/* ignore */
	}
	saveUninstalled(uninstalled);
	void pushToServer(uninstalled);
	publishSnapshot();
}

/** 读者触发 seed（谁先 fetch 到 agent 列表谁发）。owner 未初始化时是 no-op。 */
export function requestAgentSeed(allIds: string[], mainId?: string): void {
	prefsBus.publish(AGENT_PREFS_SEED_TOPIC, { allIds, mainId });
}

const _BINDING_KEY = "__FORGEAX_AGENT_PREFS_BINDING__";
const MODULE_BINDING_OWNER = {};
interface AgentPrefsBinding {
	owner: object;
	bus: AgentPrefsBus;
	disposeSeed: () => void;
	disposeStorage: () => void;
}
type WithBinding = { [_BINDING_KEY]?: AgentPrefsBinding };
/** boot 时由 owner（studio 聚合 / 独立 settings）调用一次：发首帧快照 + 挂 seed/storage 监听。 */
export function initAgentPrefs(bus: AgentPrefsBus = localBus): void {
	prefsBus = bus;
	const g = globalThis as unknown as WithBinding;
	const previous = g[_BINDING_KEY];
	if (previous?.owner === MODULE_BINDING_OWNER && previous.bus === bus) {
		publishSnapshot();
		return;
	}
	previous?.disposeSeed();
	previous?.disposeStorage();
	const disposeSeed = bus.subscribe(AGENT_PREFS_SEED_TOPIC, (p) => {
		const { allIds, mainId } = (p ?? {}) as {
			allIds?: string[];
			mainId?: string;
		};
		if (Array.isArray(allIds)) seedFromAgentList(allIds, mainId);
	});
	let disposeStorage: () => void = () => {};
	if (typeof window !== "undefined") {
		const onStorage = (e: StorageEvent) => {
			if (e.key === UNINSTALLED_KEY) publishSnapshot();
		};
		window.addEventListener("storage", onStorage);
		disposeStorage = () => window.removeEventListener("storage", onStorage);
	}
	g[_BINDING_KEY] = {
		owner: MODULE_BINDING_OWNER,
		bus,
		disposeSeed,
		disposeStorage,
	};
	publishSnapshot();
}

const EMPTY: AgentPrefsSnapshot = {
	uninstalledAgentIds: [],
	defaultBootstrapAgent: null,
};
let currentSnapshot: AgentPrefsSnapshot = EMPTY;
/** React 读侧 —— 任何 app 用它读共享 agent 偏好。 */
export function useAgentPrefs(): AgentPrefsSnapshot {
	return useSyncExternalStore(
		(listener) => {
			snapshotListeners.add(listener);
			return () => snapshotListeners.delete(listener);
		},
		() => currentSnapshot,
		() => EMPTY,
	);
}
