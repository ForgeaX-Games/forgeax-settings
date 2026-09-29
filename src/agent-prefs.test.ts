import { describe, expect, it } from "bun:test";
import {
	AGENT_PREFS_SEED_TOPIC,
	type AgentPrefsBus,
	initAgentPrefs,
} from "./agent-prefs";

function fakeBus() {
	const retained = new Map<string, unknown>();
	const listeners = new Map<string, Set<(payload: unknown) => void>>();
	const bus: AgentPrefsBus = {
		publish(topic, payload, options) {
			if (options?.retain) retained.set(topic, payload);
			for (const listener of listeners.get(topic) ?? []) listener(payload);
		},
		peek: (topic) => retained.get(topic),
		subscribe(topic, listener) {
			const topicListeners = listeners.get(topic) ?? new Set();
			topicListeners.add(listener);
			listeners.set(topic, topicListeners);
			return () => topicListeners.delete(listener);
		},
	};
	return {
		bus,
		listenerCount: (topic: string) => listeners.get(topic)?.size ?? 0,
	};
}

describe("agent preferences bus binding", () => {
	it("is idempotent for one bus and safely rebinds to another bus", () => {
		const first = fakeBus();
		const second = fakeBus();

		initAgentPrefs(first.bus);
		initAgentPrefs(first.bus);
		expect(first.listenerCount(AGENT_PREFS_SEED_TOPIC)).toBe(1);

		initAgentPrefs(second.bus);
		expect(first.listenerCount(AGENT_PREFS_SEED_TOPIC)).toBe(0);
		expect(second.listenerCount(AGENT_PREFS_SEED_TOPIC)).toBe(1);
	});
});
