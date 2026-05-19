import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { StringListEditor } from '../../components/string-list-editor';
import { SettingsSectionProps } from '../../settings-section-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function DisplaySection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems([...keys], settings, onBulkScope);

	return (
		<div>
			<FormSectionHeader title={displayDescriptor.label} menuItems={menuItems} large />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<StringListEditor
						items={(settings[key]?.value as string[]) ?? []}
						placeholder="https://..."
						onChange={v => onUpdate(key, v)}
					/>
				</SettingRow>
			))}
		</div>
	);
}

export const displayDescriptor = {
	id: 'appearance.display',
	group: 'appearance',
	label: 'Display',
	component: DisplaySection,
	keys: [
		'predicates.label',
		'predicates.description'
	],
} as const satisfies SettingsSectionDescriptor;
