import { RosterAgentAvatarVideo } from "./RosterAgentAvatarVideo";
import type { RosterAgentAvatarRules } from "./roster-agent-avatar-types";

interface CatalogAgent {
	id: string;
	avatarRules?: RosterAgentAvatarRules;
}

/** Settings roster avatar shell — fixed size, video from catalog rules when present. */
export function AgentAvatar({
	agent,
	size = 32,
	className,
}: {
	agent: CatalogAgent;
	size?: number;
	className?: string;
}) {
	return (
		<span
			className={["agent-av", className].filter(Boolean).join(" ")}
			data-agent-id={agent.id}
			style={{ width: size, height: size }}
			aria-hidden
		>
			<RosterAgentAvatarVideo
				rules={agent.avatarRules}
				size={size}
				className="agent-av-video"
			/>
		</span>
	);
}
