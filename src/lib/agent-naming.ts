export interface AgentNaming {
  title: string;
  sub: string;
}

export function resolveNaming(a: {
  naming?: AgentNaming | null;
  name?: string;
  displayName?: { zh?: string; en?: string } | string;
  id?: string;
}): AgentNaming {
  if (a.naming?.title) return a.naming;
  const fallback =
    a.name?.trim() ||
    (typeof a.displayName === 'string'
      ? a.displayName
      : a.displayName?.zh ?? a.displayName?.en) ||
    a.id ||
    '';
  return { title: fallback, sub: '' };
}
