import type { Locale } from "../../../runtime";
import type {
	AgentDetailDraft,
	AgentDetailLoaded,
	AgentMemoryItem,
	AgentSkillItem,
	AgentToolItem,
} from "./agent-detail-types";

interface TreeNode {
	name: string;
	path: string;
	type: "file" | "dir";
	children?: TreeNode[];
}

interface ManifestsAgentRow {
	extensionId: string;
	personaPath: string;
	definition: {
		id: string;
		memoryDir?: string;
		defaultSkills?: Array<{ skillId?: string; source?: string }>;
		tools?: string[];
		defaultLang?: string;
	};
}

interface ManifestsSkillRow {
	extensionId: string;
	id: string;
	entry?: { kind?: string; file?: string };
}

interface ManifestsManifestRow {
	id: string;
	originPath?: string;
}

interface ManifestsSnapshot {
	agents?: ManifestsAgentRow[];
	skills?: ManifestsSkillRow[];
	manifests?: ManifestsManifestRow[];
}

export function projectRelFromAbs(abs: string): string | null {
	const norm = abs.replace(/\\/g, "/");
	const idx = norm.indexOf("packages/");
	if (idx < 0) return null;
	return norm.slice(idx);
}

export function extensionRootRelFromOriginPath(
	originPath: string,
): string | null {
	const rel = projectRelFromAbs(originPath);
	if (!rel) return null;
	return rel.replace(/\/forgeax-extension\.json$/, "");
}

function joinRel(...parts: string[]): string {
	return parts
		.filter(Boolean)
		.join("/")
		.replace(/\/+/g, "/")
		.replace(/^\.\//, "");
}

function collectMdFiles(node: TreeNode, out: string[] = []): string[] {
	if (node.type === "file" && node.path.endsWith(".md")) out.push(node.path);
	for (const child of node.children ?? []) collectMdFiles(child, out);
	return out;
}

async function readTextFile(rel: string): Promise<string | null> {
	const r = await fetch(
		`/api/files?path=${encodeURIComponent(rel)}&optional=1`,
	);
	if (!r.ok) return null;
	const body = (await r.json()) as {
		content?: string | null;
		exists?: boolean;
	};
	if (body.exists === false) return null;
	return typeof body.content === "string" ? body.content : null;
}

function parseSkillDescription(markdown: string): string {
	const m = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return "";
	for (const line of m[1].split("\n")) {
		const trimmed = line.trim();
		if (trimmed.startsWith("description:")) {
			return trimmed
				.slice("description:".length)
				.trim()
				.replace(/^['"]|['"]$/g, "");
		}
	}
	return "";
}

async function loadMemoryItems(
	memoryBaseRel: string,
): Promise<AgentMemoryItem[]> {
	const r = await fetch(
		`/api/files/tree?root=${encodeURIComponent(memoryBaseRel)}&optional=1`,
	);
	if (!r.ok) return [];
	const body = (await r.json()) as { tree?: TreeNode | null };
	if (!body.tree) return [];
	const paths = collectMdFiles(body.tree);
	const items: AgentMemoryItem[] = [];
	for (const path of paths) {
		const content = await readTextFile(path);
		if (content === null) continue;
		items.push({
			file: path.split("/").pop() ?? path,
			body: content,
			path,
		});
	}
	return items;
}

function findExtensionRootRel(
	manifests: ManifestsManifestRow[],
	extensionId: string,
): string | null {
	const row = manifests.find((m) => m.id === extensionId);
	if (!row?.originPath) return null;
	return extensionRootRelFromOriginPath(row.originPath);
}

async function loadSkillItems(
	agent: ManifestsAgentRow,
	skills: ManifestsSkillRow[],
	manifests: ManifestsManifestRow[],
): Promise<AgentSkillItem[]> {
	const extRoot = findExtensionRootRel(manifests, agent.extensionId);
	const refs = agent.definition.defaultSkills ?? [];
	const items: AgentSkillItem[] = [];
	for (const ref of refs) {
		const skillId = ref.skillId;
		if (!skillId) continue;
		const skill = skills.find(
			(s) => s.extensionId === agent.extensionId && s.id === skillId,
		);
		const kind = skill?.entry?.kind ?? "prompt";
		let path: string | undefined;
		let body = "";
		let desc = "";
		if (extRoot && skill?.entry?.file) {
			path = joinRel(extRoot, skill.entry.file);
			const content = await readTextFile(path);
			if (content !== null) {
				body = content;
				desc = parseSkillDescription(content);
			}
		}
		items.push({ id: skillId, kind, desc, body, path });
	}
	return items;
}

function loadToolItems(tools?: string[]): AgentToolItem[] {
	if (!tools?.length) return [];
	return tools.map((id) => ({ id, desc: "" }));
}

export function snapshotDraft(draft: AgentDetailDraft): string {
	return JSON.stringify({
		persona: draft.persona,
		memory: draft.memory,
		skills: draft.skills,
		tools: draft.tools,
	});
}

export async function loadAgentDetail(
	agentId: string,
	locale: Locale,
): Promise<AgentDetailLoaded> {
	const lang = locale === "zh" ? "zh" : "en";
	const empty: AgentDetailDraft = {
		persona: "",
		memory: [],
		skills: [],
		tools: [],
	};
	const meta: AgentDetailLoaded["meta"] = {};

	const [personaRes, manifestsRes] = await Promise.all([
		fetch(`/api/agents/${encodeURIComponent(agentId)}/persona?lang=${lang}`),
		fetch("/api/extensions/manifests"),
	]);

	let persona = "";
	if (personaRes.ok) {
		const body = (await personaRes.json()) as { content?: string };
		persona = typeof body.content === "string" ? body.content : "";
	}

	if (!manifestsRes.ok) {
		return { draft: { ...empty, persona }, meta };
	}

	const snap = (await manifestsRes.json()) as ManifestsSnapshot;
	const agent = (snap.agents ?? []).find((a) => a.definition.id === agentId);
	if (!agent) {
		return { draft: { ...empty, persona }, meta };
	}

	const manifests = snap.manifests ?? [];
	const extRoot =
		findExtensionRootRel(manifests, agent.extensionId) ??
		projectRelFromAbs(agent.personaPath)?.replace(/\/persona\/[^/]+$/, "") ??
		undefined;

	if (agent.definition.memoryDir && extRoot) {
		meta.memoryBaseRel = joinRel(extRoot, agent.definition.memoryDir);
		const memory = await loadMemoryItems(meta.memoryBaseRel);
		empty.memory = memory;
	}

	empty.skills = await loadSkillItems(agent, snap.skills ?? [], manifests);
	empty.tools = loadToolItems(agent.definition.tools);

	return { draft: { ...empty, persona }, meta };
}

async function writeTextFile(path: string, content: string): Promise<void> {
	const r = await fetch("/api/files", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ path, content }),
	});
	if (!r.ok) {
		const body = (await r.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? `write failed: HTTP ${r.status}`);
	}
}

async function deleteFile(path: string): Promise<void> {
	await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
		method: "DELETE",
	});
}

export async function saveAgentDetail(
	agentId: string,
	locale: Locale,
	draft: AgentDetailDraft,
	saved: AgentDetailDraft,
	meta: AgentDetailLoaded["meta"],
): Promise<void> {
	const lang = locale === "zh" ? "zh" : "en";

	if (draft.persona !== saved.persona) {
		const r = await fetch(
			`/api/agents/${encodeURIComponent(agentId)}/persona`,
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ lang, content: draft.persona }),
			},
		);
		if (!r.ok) {
			const body = (await r.json().catch(() => ({}))) as { error?: string };
			throw new Error(body.error ?? `persona save failed: HTTP ${r.status}`);
		}
	}

	const savedMemoryPaths = new Set(
		saved.memory.map((m) => m.path).filter(Boolean) as string[],
	);
	const draftMemoryPaths = new Set(
		draft.memory.map((m) => m.path).filter(Boolean) as string[],
	);
	for (const path of savedMemoryPaths) {
		if (!draftMemoryPaths.has(path)) await deleteFile(path);
	}
	for (const item of draft.memory) {
		const path =
			item.path ??
			(meta.memoryBaseRel ? joinRel(meta.memoryBaseRel, item.file) : undefined);
		if (!path) continue;
		const prev = saved.memory.find(
			(m) => (m.path ?? m.file) === (item.path ?? item.file),
		);
		if (prev?.body === item.body && prev.path === item.path) continue;
		await writeTextFile(path, item.body);
	}

	for (const item of draft.skills) {
		if (!item.path) continue;
		const prev = saved.skills.find((s) => s.id === item.id);
		if (prev?.body === item.body && prev.desc === item.desc) continue;
		await writeTextFile(item.path, item.body);
	}
}
