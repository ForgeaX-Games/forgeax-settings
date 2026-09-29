import { describe, expect, test } from "bun:test";
import {
	extensionRootRelFromOriginPath,
	projectRelFromAbs,
	snapshotDraft,
} from "./agent-detail-data";
import type { AgentDetailDraft } from "./agent-detail-types";

describe("agent-detail-data", () => {
	test("converts absolute paths to project-relative packages paths", () => {
		expect(
			projectRelFromAbs(
				"/data/workspace/forgeax-studio/packages/marketplace/extensions/agent-iro/persona/zh.md",
			),
		).toBe("packages/marketplace/extensions/agent-iro/persona/zh.md");
		expect(projectRelFromAbs("C:\\repo\\packages\\foo\\bar.md")).toBe(
			"packages/foo/bar.md",
		);
		expect(projectRelFromAbs("/tmp/other.txt")).toBeNull();
	});

	test("derives extension root from origin path", () => {
		expect(
			extensionRootRelFromOriginPath(
				"/data/workspace/forgeax-studio/packages/marketplace/extensions/agent-iro/forgeax-extension.json",
			),
		).toBe("packages/marketplace/extensions/agent-iro");
	});

	test("snapshots draft for dirty detection", () => {
		const draft: AgentDetailDraft = {
			persona: "# hello",
			memory: [{ file: "a.md", body: "x" }],
			skills: [],
			tools: [],
		};
		expect(snapshotDraft(draft)).toBe(snapshotDraft({ ...draft }));
		expect(snapshotDraft({ ...draft, persona: "# bye" })).not.toBe(
			snapshotDraft(draft),
		);
	});
});
