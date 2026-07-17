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
		'shacl.validateOnStartup',
		'shacl.validateOnChange',
		'shacl.maxGraphSize',
		'shacl.shapesFolder',
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
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, ['shacl.enabled', 'shacl.validateOnStartup', 'shacl.validateOnChange', 'shacl.maxGraphSize', 'shacl.shapesFolder'], settings, onBulkScope);

	// The auto-validation options only take effect while SHACL validation is
	// enabled, so they are disabled until the master switch is on.
	const shaclEnabled = settings['shacl.enabled']?.value === true;

	return (
		<div>
			<SectionHeader title={validationGeneralSection.label} menuItems={menuItems} variant="title" />
			<SettingRow {...rowProps('shacl.enabled')}>
				<vscode-checkbox
					checked={shaclEnabled}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('shacl.validateOnStartup')}>
				<vscode-checkbox
					checked={settings['shacl.validateOnStartup']?.value === true}
					disabled={!shaclEnabled}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.validateOnStartup', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('shacl.validateOnChange')}>
				<vscode-checkbox
					checked={settings['shacl.validateOnChange']?.value === true}
					disabled={!shaclEnabled}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.validateOnChange', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('shacl.maxGraphSize')}>
				<vscode-textfield
					className="setting-input-md"
					value={String(settings['shacl.maxGraphSize']?.value ?? 50000)}
					type="number"
					disabled={!shaclEnabled}
					onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.maxGraphSize', Number((e.target as HTMLInputElement).value))}
				>
					<span slot="content-after" className="setting-input-suffix">triples</span>
				</vscode-textfield>
			</SettingRow>
			<SettingRow {...rowProps('shacl.shapesFolder')}>
				<vscode-textfield
					className="setting-input-md"
					value={String(settings['shacl.shapesFolder']?.value ?? '.mentor/shapes')}
					placeholder=".mentor/shapes"
					onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.shapesFolder', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
		</div>
	);
}
