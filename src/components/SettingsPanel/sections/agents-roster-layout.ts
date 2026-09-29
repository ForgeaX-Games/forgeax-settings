/**
 * Settings agents roster — visual layout SSOT (matches ForgeaX Studio 设置界面.html #agents-v2).
 * Copy, avatars, and descriptions come from GET /api/agents (extension manifest description.zh/en).
 */

export type LocaleCopy = { zh: string; en: string };

export interface RosterRowSpec {
	id: string;
	isLead?: boolean;
}

export interface RosterSubSpec {
	label: LocaleCopy;
	rows: RosterRowSpec[];
}

export interface RosterCardSpec {
	label: LocaleCopy;
	rows?: RosterRowSpec[];
	subs?: RosterSubSpec[];
}

export interface AgentsRosterLayout {
	topRow: RosterRowSpec;
	cards: RosterCardSpec[];
}

export const AGENTS_ROSTER_LAYOUT: AgentsRosterLayout = {
	topRow: { id: "forge" },
	cards: [
		{
			label: { zh: "美术", en: "Art" },
			rows: [
				{ id: "iro", isLead: true },
				{ id: "animator-2d" },
				{ id: "character-designer-2d" },
				{ id: "vfx-artist-3d" },
				{ id: "lowpoly" },
			],
		},
		{
			label: { zh: "场景", en: "Scenes" },
			rows: [{ id: "director", isLead: true }, { id: "sino" }, { id: "mira" }],
		},
		{
			label: { zh: "影游", en: "Film / Games" },
			rows: [
				{ id: "reia", isLead: true },
				{ id: "reel-storyboard" },
				{ id: "reel-video" },
				{ id: "reel-visual" },
				{ id: "reel-editor" },
			],
		},
		{
			label: { zh: "程序", en: "Engineering" },
			subs: [
				{
					label: { zh: "人格", en: "Personas" },
					rows: [
						{ id: "mochi" },
						{ id: "rin" },
						{ id: "sakura" },
						{ id: "kaede" },
						{ id: "kumo" },
					],
				},
				{
					label: { zh: "引擎", en: "Drivers" },
					rows: [
						{ id: "cc-coder" },
						{ id: "claude-code-default" },
						{ id: "codex-default" },
						{ id: "cursor-default" },
					],
				},
			],
		},
		{
			label: { zh: "独立", en: "Standalone" },
			rows: [
				{ id: "suzu" },
				{ id: "kotone" },
				{ id: "tsumugi" },
				{ id: "ai-asset" },
				{ id: "ui-designer" },
				{ id: "gen3d" },
				{ id: "nodia" },
				{ id: "yevi" },
				{ id: "lock" },
			],
		},
	],
};

/** Flip to true when settings agent detail navigation is ready to ship. */
export const AGENTS_ROSTER_DETAIL_ENABLED = false;

export function allRosterAgentIds(
	layout: AgentsRosterLayout = AGENTS_ROSTER_LAYOUT,
): string[] {
	const ids = new Set<string>([layout.topRow.id]);
	for (const card of layout.cards) {
		for (const row of card.rows ?? []) ids.add(row.id);
		for (const sub of card.subs ?? []) {
			for (const row of sub.rows) ids.add(row.id);
		}
	}
	return [...ids];
}
