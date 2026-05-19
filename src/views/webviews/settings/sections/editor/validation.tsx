import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function ValidationSection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(['shacl.enabled'], settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader
				title={<>{validationDescriptor.label} <span className="badge-experimental">Experimental</span></>}
				menuItems={menuItems}
				large
			/>
			<SettingRow {...rowProps('shacl.enabled')}>
				<vscode-checkbox
					checked={settings['shacl.enabled']?.value === true}
					onChange={(e: any) => onUpdate('shacl.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
		</div>
	);
}

export const validationDescriptor = {
	id: 'editor.validation',
	group: 'editor',
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
