import { Eye, EyeOff } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useTranslation } from "../runtime";

export function Section({
	icon,
	title,
	hint,
	children,
}: {
	icon: ReactNode;
	title: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="settings-section">
			<div className="settings-section-head">
				<span className="settings-section-icon">{icon}</span>
				<span className="settings-section-title">{title}</span>
			</div>
			{hint && <div className="settings-section-hint">{hint}</div>}
			<div className="settings-section-body">{children}</div>
		</div>
	);
}

export function EnvField({
	label,
	masked,
	placeholder,
	onSave,
	busy,
	visible,
	notSetHint,
	onReset,
	resetTitle,
}: {
	label: string;
	masked: string | null;
	placeholder: string;
	onSave: (value: string) => void;
	busy: boolean;
	visible?: boolean;
	notSetHint?: string;
	onReset?: () => void;
	resetTitle?: string;
}) {
	const { t } = useTranslation();
	const inputId = useId();
	const stored = masked ?? "";
	const [value, setValue] = useState(visible ? stored : "");
	const [revealed, setRevealed] = useState(false);

	useEffect(() => {
		setValue(visible ? (masked ?? "") : "");
		setRevealed(false);
	}, [masked, visible]);

	const trimmed = value.trim();
	const dirty = visible ? trimmed !== stored : trimmed.length > 0;
	const placeholderText = visible
		? placeholder
		: masked
			? t("settings.drawer.savedMasked", { masked })
			: (notSetHint ?? t("settings.drawer.envNotSet"));

	const commit = () => {
		if (!trimmed || !dirty || busy) return;
		onSave(trimmed);
		if (!visible) setValue("");
		setRevealed(false);
	};
	const reset = () => {
		if (!onReset || busy || !masked) return;
		onReset();
		setValue("");
		setRevealed(false);
	};

	return (
		<div className="settings-row">
			<label
				className={`settings-label${label.length > 28 ? " settings-label--long" : ""}`}
				htmlFor={inputId}
				title={label}
			>
				{label}
			</label>
			<div className={`settings-input-wrap${visible ? "" : " with-eye"}`}>
				<input
					id={inputId}
					className="settings-input"
					type={visible || revealed ? "text" : "password"}
					value={value}
					placeholder={placeholderText}
					spellCheck={false}
					autoComplete="off"
					onChange={(event) => setValue(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") commit();
					}}
					disabled={busy}
				/>
				{!visible && (
					<button
						type="button"
						className="settings-eye-btn"
						onClick={() => setRevealed((current) => !current)}
						title={
							revealed ? t("settings.drawer.hide") : t("settings.drawer.show")
						}
						tabIndex={-1}
					>
						{revealed ? <EyeOff size={12} /> : <Eye size={12} />}
					</button>
				)}
			</div>
			{onReset && (
				<button
					type="button"
					className="settings-cancel-btn"
					onClick={reset}
					disabled={busy || !masked}
					title={resetTitle ?? t("settings.upload.resetTokenTitle")}
				>
					{t("common.reset")}
				</button>
			)}
			<button
				type="button"
				className="settings-save-btn"
				onClick={commit}
				disabled={busy || !dirty}
				title={
					dirty
						? ""
						: visible
							? t("settings.drawer.noChanges")
							: t("settings.drawer.enterNewKeyHint")
				}
			>
				{t("common.save")}
			</button>
		</div>
	);
}
