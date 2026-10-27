import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorFormEditorSection = {
	id: 'editor.formEditor',
	label: 'Form Editor',
	component: EditorFormEditorSection,
	keys: [
		'formEditor.enabled',
	],
} as const satisfies SettingsSectionDescriptor;

/**
 * The settings of the experimental form based editor.
 */
function EditorFormEditorSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

	return (
		<div>
			<SectionHeader title={editorFormEditorSection.label} menuItems={menuItems} variant="title" />
			<SettingRow {...rowProps('formEditor.enabled')}>
				<vscode-checkbox
					checked={settings['formEditor.enabled']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formEditor.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
		</div>
	);
}
