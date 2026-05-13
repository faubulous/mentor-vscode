import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES } from '../settings-metadata';

export interface DisplaySectionProps {
	keys: string[];
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function DisplaySection({ keys, settings, onUpdate, onScopeChange, onBulkScope }: DisplaySectionProps) {
	return (
		<div>
			<SectionHeader title={SECTION_TITLES['appearance.display']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			{keys.map((key) => (
				<SettingRow
					key={key}
					label={settings[key]?.title ?? ''}
					description={settings[key]?.description ?? ''}
					settingKey={key}
					settings={settings}
					onScopeChange={onScopeChange}
				>
					<StringListEditor
						items={(settings[key]?.value as string[]) ?? []}
						placeholder="https://..."
						onChange={v => onUpdate(key, v)}
					/>
				</SettingRow>
			))}
		</div>
	);
}
