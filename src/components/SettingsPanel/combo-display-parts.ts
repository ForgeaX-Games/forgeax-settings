const MAC_MODIFIER_LABELS: Record<string, string> = {
	Ctrl: "Command",
	Shift: "Shift",
	Alt: "Option",
};

export function comboDisplayParts(
	combo: string,
	platform: "mac" | "windows",
): string[] {
	return combo
		.split("+")
		.map((part) =>
			platform === "mac" ? (MAC_MODIFIER_LABELS[part] ?? part) : part,
		);
}
