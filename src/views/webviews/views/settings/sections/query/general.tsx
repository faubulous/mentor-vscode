import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const queryGeneralSection = {
	id: 'query.general',
	label: 'General',
	component: QueryGeneralSection,
	keys: [
		'sparql.resultsCopyFormat',
		'sparql.resultsIriFormat',
	],
} as const satisfies SettingsSectionDescriptor;

function QueryGeneralSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

	const resultsCopyFormatRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'sparql.resultsCopyFormat', element.value)
	);

	const resultsIriFormatRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'sparql.resultsIriFormat', element.value)
	);

	return (
		<div>
			<SectionHeader title={queryGeneralSection.label} menuItems={menuItems} variant="title" />
			<SettingRow {...rowProps('sparql.resultsCopyFormat')}>
				<vscode-single-select
					ref={resultsCopyFormatRef}
					value={String(settings['sparql.resultsCopyFormat']?.value ?? 'csv')}
				>
					{(settings['sparql.resultsCopyFormat']?.enumOptions ?? []).map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow {...rowProps('sparql.resultsIriFormat')}>
				<vscode-single-select
					ref={resultsIriFormatRef}
					value={String(settings['sparql.resultsIriFormat']?.value ?? 'full')}
				>
					{(settings['sparql.resultsIriFormat']?.enumOptions ?? []).map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}
