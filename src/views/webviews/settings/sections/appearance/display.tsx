import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { StringListEditor } from '../../components/string-list-editor';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const appearanceDisplaySection = {
	id: 'appearance.display',
	label: 'Display',
	component: DisplaySection,
	keys: [
		'predicates.label',
		'predicates.description'
	],
} as const satisfies SettingsSectionDescriptor;

export function DisplaySection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, [...keys], settings, onBulkScope);

	return (
		<div>
			<FormSectionHeader title={appearanceDisplaySection.label} menuItems={menuItems} large />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<StringListEditor
						items={(settings[key]?.value as string[]) ?? []}
						placeholder="https://..."
						onChange={v => onUpdate(MENTOR_SOURCE, key, v)}
					/>
				</SettingRow>
			))}
		</div>
	);
}