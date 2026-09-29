// Standalone settings dev server — self-contained build config OWNED by this
// package (not imported from interface). Defaults to :18933; override
// FORGEAX_SETTINGS_PORT.
//
// Public workspace packages resolve through this package's own dependency
// graph. Only the shared contracts source needs a Studio checkout alias.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));
const sib = (p: string) => resolve(PACKAGE_DIR, "..", p);

const ROOT_ENV = resolve(PACKAGE_DIR, "../../.env");
if (existsSync(ROOT_ENV)) {
	for (const line of readFileSync(ROOT_ENV, "utf-8").split("\n")) {
		const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
		if (m && !(m[1] in process.env))
			process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
	}
}

const SERVER = process.env.FORGEAX_SERVER_URL ?? "http://127.0.0.1:18900";
const SERVER_WS = SERVER.replace(/^http/, "ws");

const HTTPS_ENABLED = process.env.FORGEAX_INTERFACE_HTTPS === "1";
const ROOT_TLS = resolve(PACKAGE_DIR, "../../.tls");
const tlsCertPath = existsSync(resolve(ROOT_TLS, "cert.pem"))
	? resolve(ROOT_TLS, "cert.pem")
	: resolve(PACKAGE_DIR, ".tls/cert.pem");
const tlsKeyPath = existsSync(resolve(ROOT_TLS, "key.pem"))
	? resolve(ROOT_TLS, "key.pem")
	: resolve(PACKAGE_DIR, ".tls/key.pem");
const useCustomCert =
	HTTPS_ENABLED && existsSync(tlsCertPath) && existsSync(tlsKeyPath);
const httpsServerOption = useCustomCert
	? { cert: readFileSync(tlsCertPath), key: readFileSync(tlsKeyPath) }
	: undefined;

export default defineConfig({
	plugins: [
		react(),
		checker({
			typescript: true,
			biome: {
				command: "check",
				flags: "--config-path=biome.json --diagnostic-level=error",
				dev: { logLevel: ["error"] },
			},
			overlay: { initialIsOpen: "error" },
			terminal: true,
		}),
		...(HTTPS_ENABLED && !useCustomCert ? [basicSsl()] : []),
	],
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			"@forgeax/types": sib("contracts/types/src/index.ts"),
		},
	},
	optimizeDeps: { exclude: ["@forgeax/engine-runtime"] },
	server: {
		port: Number(process.env.FORGEAX_SETTINGS_PORT ?? 18933),
		host: "0.0.0.0",
		strictPort: true,
		open: false,
		...(httpsServerOption !== undefined ? { https: httpsServerOption } : {}),
		watch: {
			usePolling: false,
			ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
		},
		fs: { allow: ["..", "../.."] },
		proxy: {
			"/api": { target: SERVER, changeOrigin: true },
			"/ws": { target: SERVER_WS, ws: true, changeOrigin: true },
		},
	},
});
