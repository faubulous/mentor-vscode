import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorValidationSection = {
	id: 'editor.validation',
	label: 'Validation',
	component: ValidationSection,
	keys: [
		'shacl.validation',
		'shacl.enabled',
		'linting.enabled',
		'linting.unresolvedReferenceSeverity',
		'linting.unresolvedWorkspaceGraphSeverity',
	],
} as const satisfies SettingsSectionDescriptor;

export function ValidationSection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, ['shacl.enabled'], settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader title={editorValidationSection.label} menuItems={menuItems} large />
			<SettingRow {...rowProps('shacl.enabled')}>
				<vscode-checkbox
					checked={settings['shacl.enabled']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'shacl.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
		</div>
	);
}