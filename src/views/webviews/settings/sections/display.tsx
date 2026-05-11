import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';
import { SETTINGS_METADATA, SECTION_TITLES } from '../settings-metadata';

export interface DisplaySectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function DisplaySection({ settings, onUpdate, onScopeChange, onBulkScope }: DisplaySectionProps) {
	const keys = ['predicates.label', 'predicates.description'];

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['appearance.display']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label={SETTINGS_METADATA['predicates.label'].title}
				description={SETTINGS_METADATA['predicates.label'].description}
				settingKey="predicates.label"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['predicates.label']?.value as string[]) ?? []}
					placeholder="https://..."
					onChange={v => onUpdate('predicates.label', v)}
				/>
			</SettingRow>
			<SettingRow
				label={SETTINGS_METADATA['predicates.description'].title}
				description={SETTINGS_METADATA['predicates.description'].description}
				settingKey="predicates.description"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['predicates.description']?.value as string[]) ?? []}
					placeholder="https://..."
					onChange={v => onUpdate('predicates.description', v)}
				/>
			</SettingRow>
		</div>
	);
}
