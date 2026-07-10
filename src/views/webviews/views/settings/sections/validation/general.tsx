import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const validationGeneralSection = {
	id: 'validation.general',
	label: 'General',
	component: ValidationGeneralSection,
	defaultScope: 'workspace',
	keys: [
		'shacl.enabled',
	],
	// Claimed but not rendered: linting is experimental and stays configurable
	// via settings.json only.
	hiddenKeys: [
		'linting.enabled',
		'linting.unresolvedReferenceSeverity',
		'linting.unresolvedWorkspaceGraphSeverity',
	],
} as const satisfies SettingsSectionDescriptor;

export function ValidationGeneralSection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, ['shacl.enabled'], settings, onBulkScope);

	return (
		<div>
			<SectionHeader title={validationGeneralSection.label} menuItems={menuItems} variant="title" />
			<SettingRow {...rowProps('shacl.enabled')}>
				<vscode-checkbox
					checked={settings['shacl.enabled']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
		</div>
	);
}
