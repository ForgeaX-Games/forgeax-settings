import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PACKAGE_ROOT = join(import.meta.dir, "..");
const MAINTAINED_ROOTS = [
	join(PACKAGE_ROOT, "src"),
	join(PACKAGE_ROOT, "package.json"),
	join(PACKAGE_ROOT, "tsconfig.json"),
	join(PACKAGE_ROOT, "vite.config.ts"),
];

function maintainedFiles(path: string): string[] {
	if (!statSync(path).isDirectory()) return [path];
	return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
		const child = join(path, entry.name);
		if (entry.isDirectory()) return maintainedFiles(child);
		return /\.(?:css|json|ts|tsx)$/.test(entry.name) ? [child] : [];
	});
}

describe("Interface retirement ownership", () => {
	test("Settings has no direct Interface imports, dependencies, or source aliases", () => {
		const violations = MAINTAINED_ROOTS.flatMap(maintainedFiles)
			.flatMap((file) => {
				const source = readFileSync(file, "utf8");
				return source
					.split("\n")
					.map((line, index) => ({ file, line, lineNumber: index + 1 }))
					.filter(({ line }) =>
						/@forgeax\/interface|\.\.\/interface/.test(line),
					);
			})
			.filter(({ file }) => file !== import.meta.path)
			.map(
				({ file, line, lineNumber }) =>
					`${relative(PACKAGE_ROOT, file)}:${lineNumber}: ${line.trim()}`,
			);

		expect(violations).toEqual([]);
	});
});
