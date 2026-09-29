export interface AgentMemoryItem {
	file: string;
	body: string;
	/** Project-relative path for persistence via /api/files. */
	path?: string;
}

export interface AgentSkillItem {
	id: string;
	kind: string;
	desc: string;
	body: string;
	path?: string;
}

export interface AgentToolItem {
	id: string;
	desc: string;
}

export interface AgentDetailDraft {
	persona: string;
	memory: AgentMemoryItem[];
	skills: AgentSkillItem[];
	tools: AgentToolItem[];
}

export interface AgentDetailLoadMeta {
	memoryBaseRel?: string;
}

export interface AgentDetailLoaded {
	draft: AgentDetailDraft;
	meta: AgentDetailLoadMeta;
}
