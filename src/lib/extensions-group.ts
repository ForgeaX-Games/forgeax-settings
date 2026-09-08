import type { SettingsExtensionInfo } from './extensions-api';
import { pickExtensionLang } from './extensions-api';

export interface SettingsExtensionKindGroup {
  kind: string;
  items: SettingsExtensionInfo[];
}

const KIND_ORDER: Record<string, number> = {
  extension: 10,
  agent: 20,
  'cli-provider': 30,
  'model-binding': 40,
  skill: 50,
  tool: 60,
};

export function groupExtensionsByKind(items: SettingsExtensionInfo[]): SettingsExtensionKindGroup[] {
  const m = new Map<string, SettingsExtensionInfo[]>();
  for (const it of items) {
    const list = m.get(it.kind) ?? [];
    list.push(it);
    m.set(it.kind, list);
  }
  const groups: SettingsExtensionKindGroup[] = [];
  for (const [kind, list] of m) {
    list.sort((a, b) => a.id.localeCompare(b.id));
    groups.push({ kind, items: list });
  }
  groups.sort((a, b) => {
    const oa = KIND_ORDER[a.kind] ?? 1000;
    const ob = KIND_ORDER[b.kind] ?? 1000;
    if (oa !== ob) return oa - ob;
    return a.kind.localeCompare(b.kind);
  });
  return groups;
}

export function extensionMatchesQuery(p: SettingsExtensionInfo, q: string): boolean {
  if (!q) return true;
  const hay = [
    p.id,
    pickExtensionLang(p.displayName, 'zh', ''),
    pickExtensionLang(p.displayName, 'en', ''),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterExtensionGroups(
  groups: SettingsExtensionKindGroup[],
  query: string,
): SettingsExtensionKindGroup[] {
  return groups
    .map((g) => ({
      kind: g.kind,
      items: g.items.filter((p) => extensionMatchesQuery(p, query)),
    }))
    .filter((g) => g.items.length > 0);
}
