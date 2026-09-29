import { pickExtensionLang } from "../../../lib/extensions-api";
import type { SettingsExtensionKindGroup } from "../../../lib/extensions-group";
import { useTranslation } from "../../../runtime";

export function SettingsExtensionsTable({
	groups,
	lang,
}: {
	groups: SettingsExtensionKindGroup[];
	lang: "zh" | "en";
}) {
	const { t } = useTranslation();
	return (
		<table className="ba-table ba-table-unified">
			<colgroup>
				<col className="c-kind" />
				<col className="c-id" />
				<col className="c-name" />
				<col className="c-desc" />
				<col className="c-ver" />
			</colgroup>
			<thead>
				<tr>
					<th className="c-kind" />
					<th className="c-id">{t("settings.extensions.colId")}</th>
					<th className="c-name">{t("settings.extensions.colName")}</th>
					<th className="c-desc">{t("settings.extensions.colDesc")}</th>
					<th className="c-ver">{t("settings.extensions.colVersion")}</th>
				</tr>
			</thead>
			{groups.map((group) => (
				<tbody key={group.kind} className="ba-kind-body">
					{group.items.map((p, index) => {
						const name =
							p.naming?.title || pickExtensionLang(p.displayName, lang, p.id);
						const desc = pickExtensionLang(p.description, lang, "");
						const ver = p.version ?? "0.0.0";
						const verBumped = !/^0\.0\./.test(ver);
						return (
							<tr key={p.id}>
								{index === 0 && (
									<td className="c-kind" rowSpan={group.items.length}>
										<div className="ba-kind-head">
											<span className={`ba-kind-tag k-${group.kind}`}>
												{group.kind}
											</span>
											<span className="ba-kind-count">
												{group.items.length}
											</span>
										</div>
									</td>
								)}
								<td className="c-id" title={p.id}>
									{p.id}
								</td>
								<td className="c-name" title={name}>
									{name}
								</td>
								<td className="c-desc" title={desc || undefined}>
									<span className="ba-settings-desc">{desc}</span>
								</td>
								<td className="c-ver">
									<span
										className={`ba-ver-pill settings-ver${verBumped ? " bumped" : ""}`}
									>
										{ver}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			))}
		</table>
	);
}
