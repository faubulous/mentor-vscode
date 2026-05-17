import { SettingScope, SettingState } from '../settings-types';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../components/use-bulk-scope-menu-items';
import { SECTION_TITLES } from '../settings-metadata';

export interface ValidationSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function ValidationSection({ settings, onUpdate, setScope, onBulkScope }: ValidationSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(['shacl.enabled'], settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader
				title={<>{SECTION_TITLES['editor.validation']} <span className="badge-experimental">Experimental</span></>}
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
