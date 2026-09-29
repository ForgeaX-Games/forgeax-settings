import { Globe } from "lucide-react";
import {
	type Locale,
	SUPPORTED_LOCALES,
	useTranslation,
} from "../../../runtime";
import { Section } from "../../SettingsPrimitives";
import { FxSelect } from "../shared/FxSelect";

export function LanguageSection() {
	const { t, i18n } = useTranslation();

	return (
		<Section
			icon={<Globe size={14} />}
			title={t("settings.language.label")}
			hint={t("settings.language.description")}
		>
			<FxSelect
				value={i18n.language}
				aria-label={t("settings.language.selectAria")}
				options={SUPPORTED_LOCALES.map((l) => ({
					value: l.code,
					label: l.nativeLabel,
				}))}
				onChange={(v) => {
					void i18n.changeLanguage(v as Locale);
				}}
			/>
		</Section>
	);
}
