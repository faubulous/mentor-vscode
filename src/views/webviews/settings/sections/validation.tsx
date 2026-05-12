import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { SECTION_TITLES } from '../settings-metadata';

import '@vscode-elements/elements/dist/vscode-checkbox';

export interface ValidationSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function ValidationSection({ settings, onUpdate, onScopeChange, onBulkScope }: ValidationSectionProps) {
	return (
		<div>
			<SectionHeader
				title={<>{SECTION_TITLES['validation']} <span className="badge-experimental">Experimental</span></>}
				keys={['shacl.enabled']}
				settings={settings}
				onBulkScope={onBulkScope}
			/>
			<SettingRow
				label={settings['shacl.enabled']?.title ?? ''}
				description={settings['shacl.enabled']?.description ?? ''}
				settingKey="shacl.enabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
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
