import { describe, expect, it } from "bun:test";
import {
	loadStandaloneProviderOverride,
	saveStandaloneProviderOverride,
	syncStandaloneDocumentLanguage,
} from "./runtime";

function storage(initial?: Record<string, string>) {
	const values = new Map(Object.entries(initial ?? {}));
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
	};
}

describe("standalone Settings runtime ownership", () => {
	it("persists and restores the selected CLI provider", () => {
		const target = storage();
		saveStandaloneProviderOverride("codex", target);
		expect(loadStandaloneProviderOverride(target)).toBe("codex");

		saveStandaloneProviderOverride(null, target);
		expect(loadStandaloneProviderOverride(target)).toBeNull();
	});

	it("isolates storage access denial during standalone boot", () => {
		const descriptor = Object.getOwnPropertyDescriptor(
			globalThis,
			"localStorage",
		);
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			get() {
				throw new DOMException("denied", "SecurityError");
			},
		});
		try {
			expect(loadStandaloneProviderOverride()).toBeNull();
			expect(() => saveStandaloneProviderOverride("codex")).not.toThrow();
		} finally {
			if (descriptor)
				Object.defineProperty(globalThis, "localStorage", descriptor);
			else delete (globalThis as { localStorage?: Storage }).localStorage;
		}
	});

	it("restores a persisted document language at boot", () => {
		const root = { lang: "en" };
		syncStandaloneDocumentLanguage("zh", root);
		expect(root.lang).toBe("zh");
	});
});
