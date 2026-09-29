import { useEffect, useRef, useState } from "react";
import type { RosterAgentAvatarRules } from "./roster-agent-avatar-types";

function pickIdleState(rules: RosterAgentAvatarRules) {
	const name = rules.default;
	return (
		rules.states[name] ??
		rules.states[rules.fallback] ??
		Object.values(rules.states)[0] ??
		null
	);
}

/** Keep media work bounded to avatars the user can currently see. */
export function observeAvatarPlayback(video: HTMLVideoElement): () => void {
	const doc = video.ownerDocument;
	const view = doc.defaultView;
	if (!view) return () => video.pause();

	let inViewport = false;
	let playing = false;
	let disposed = false;
	const syncPlayback = () => {
		const shouldPlay =
			!disposed && inViewport && doc.visibilityState === "visible";
		if (shouldPlay === playing) return;
		playing = shouldPlay;
		if (shouldPlay) {
			// Autoplay policies or an intervening pause can reject play().
			void video.play().catch(() => {});
		} else {
			video.pause();
		}
	};
	const updateBounds = () => {
		const rect = video.getBoundingClientRect();
		inViewport =
			rect.width > 0 &&
			rect.height > 0 &&
			rect.bottom > 0 &&
			rect.right > 0 &&
			rect.top < view.innerHeight &&
			rect.left < view.innerWidth;
		syncPlayback();
	};
	const onVisibilityChange = () => {
		if (!observer) updateBounds();
		else syncPlayback();
	};
	const observer =
		typeof view.IntersectionObserver === "function"
			? new view.IntersectionObserver(([entry]) => {
					if (disposed || !entry) return;
					inViewport = entry.isIntersecting && entry.intersectionRatio > 0;
					syncPlayback();
				})
			: null;

	doc.addEventListener("visibilitychange", onVisibilityChange);
	if (observer) {
		observer.observe(video);
	} else {
		// Older webviews still limit playback to the viewport; capture nested scrolling.
		view.addEventListener("scroll", updateBounds, true);
		view.addEventListener("resize", updateBounds);
		updateBounds();
	}
	return () => {
		disposed = true;
		observer?.disconnect();
		doc.removeEventListener("visibilitychange", onVisibilityChange);
		view.removeEventListener("scroll", updateBounds, true);
		view.removeEventListener("resize", updateBounds);
		video.pause();
	};
}

/** Settings roster idle avatar — uses catalog `avatarRules` only; no package registry. */
export function RosterAgentAvatarVideo({
	rules,
	size,
	className,
}: {
	rules?: RosterAgentAvatarRules;
	size: number;
	className?: string;
}) {
	const state = rules ? pickIdleState(rules) : null;
	const videoUrl = state?.url ?? null;

	return (
		<span
			className={["roster-agent-avatar-video", className]
				.filter(Boolean)
				.join(" ")}
			style={{ width: size, height: size }}
			aria-hidden
		>
			{state && videoUrl && (
				<VideoPlayer
					key={`${state.desktopUrl ?? ""}|${videoUrl}`}
					state={state}
					videoUrl={videoUrl}
				/>
			)}
		</span>
	);
}

function VideoPlayer({
	state,
	videoUrl,
}: {
	state: NonNullable<ReturnType<typeof pickIdleState>>;
	videoUrl: string;
}) {
	const [ready, setReady] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);
	useEffect(() => {
		const video = videoRef.current;
		if (video) return observeAvatarPlayback(video);
	}, []);
	return (
		<video
			className={`roster-agent-avatar-vid${ready ? " is-ready" : ""}`}
			ref={videoRef}
			preload="none"
			muted
			playsInline
			loop={state?.loop ?? true}
			style={{ transition: `opacity ${state?.fadeInMs ?? 160}ms ease` }}
			onLoadedData={() => setReady(true)}
		>
			{state.desktopUrl && (
				<source
					src={state.desktopUrl}
					type={'video/quicktime; codecs="hvc1"'}
				/>
			)}
			<source src={videoUrl} type="video/webm" />
		</video>
	);
}
