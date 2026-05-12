import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES } from '../settings-metadata';

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
				label={settings['predicates.label']?.title ?? ''}
				description={settings['predicates.label']?.description ?? ''}
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
				label={settings['predicates.description']?.title ?? ''}
				description={settings['predicates.description']?.description ?? ''}
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
