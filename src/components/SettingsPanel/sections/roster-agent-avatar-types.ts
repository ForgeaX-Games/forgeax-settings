/** Mirrors `/api/agents` avatarRules — settings-local, no Agents package import. */

export interface RosterAgentAvatarState {
  state: string;
  url: string;
  desktopUrl?: string;
  loop: boolean;
  fadeInMs: number;
}

export interface RosterAgentAvatarRules {
  default: string;
  fallback: string;
  states: Record<string, RosterAgentAvatarState>;
}
