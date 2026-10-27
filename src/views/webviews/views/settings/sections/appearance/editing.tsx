import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const appearanceEditingSection = {
	id: 'appearance.editing',
	label: 'Editing',
	component: EditingSection,
	keys: [
		'formEditor.enabled',
		'formEditor.defaultView',
	],
} as const satisfies SettingsSectionDescriptor;

/**
 * How documents are edited: the experimental form based editor.
 */
function EditingSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

	const defaultViewRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formEditor.defaultView', element.value)
	);

	return (
		<div>
			<SectionHeader title={appearanceEditingSection.label} menuItems={menuItems} variant="title" />
			<SettingRow {...rowProps('formEditor.enabled')}>
				<vscode-checkbox
					checked={settings['formEditor.enabled']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formEditor.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enable the form editor
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('formEditor.defaultView')}>
				<vscode-single-select
					ref={defaultViewRef}
					value={String(settings['formEditor.defaultView']?.value ?? 'text')}
				>
					<vscode-option value="text">Text Editor</vscode-option>
					<vscode-option value="form">Form Editor</vscode-option>
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}
