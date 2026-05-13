import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES } from '../settings-metadata';

export interface DisplaySectionProps {
	keys: string[];
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function DisplaySection({ keys, settings, onUpdate, setScope, onBulkScope }: DisplaySectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	return (
		<div>
			<SectionHeader title={SECTION_TITLES['appearance.display']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
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
