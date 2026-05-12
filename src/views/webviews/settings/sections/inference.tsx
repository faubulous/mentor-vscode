import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';

export interface InferenceSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function InferenceSection({ settings, onUpdate, onScopeChange, onBulkScope }: InferenceSectionProps) {
	return (
		<div>
			<SectionHeader
				title={<>Inference <span className="badge-experimental">Experimental</span></>}
				keys={['inference.enabled']}
				settings={settings}
				onBulkScope={onBulkScope}
			/>
			<SettingRow
				label="Enable inference toggle"
				description="Show the inference toggle button in the SPARQL connection view. This feature is experimental."
				settingKey="inference.enabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['inference.enabled']?.value === true}
					onChange={(e: any) => onUpdate('inference.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
		</div>
	);
}
