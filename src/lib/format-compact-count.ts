/**
 * Compact decimal count for settings usage panel (tokens, calls).
 * Decimal SI steps of 1_000 — matches usage mock (432.0K, 120.5M).
 */
export function formatCompactCount(n: number): string {
	if (!Number.isFinite(n)) return "0";
	const v = Math.round(n);
	if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
	if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
	return String(v);
}
