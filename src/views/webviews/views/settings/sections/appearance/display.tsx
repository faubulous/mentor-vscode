import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { StringListEditor } from '../../components/string-list-editor';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const appearanceDisplaySection = {
	id: 'appearance.display',
	label: 'Display',
	component: DisplaySection,
	defaultScope: 'workspace',
	keys: [
		'predicates.label',
		'predicates.description'
	],
} as const satisfies SettingsSectionDescriptor;

function DisplaySection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

	return (
		<div>
			<SectionHeader title={appearanceDisplaySection.label} menuItems={menuItems} variant="title" />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<StringListEditor
						items={(settings[key]?.value as string[]) ?? []}
						placeholder="https://..."
						onChange={v => onUpdate(MENTOR_SETTINGS_SOURCE, key, v)}
					/>
				</SettingRow>
			))}
		</div>
	);
}