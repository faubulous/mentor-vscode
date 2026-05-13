import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { SECTION_TITLES } from '../settings-metadata';

export interface TemplatesSectionProps {
	keys: string[];
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function TemplatesSection({ keys, settings, onUpdate, onScopeChange, onBulkScope }: TemplatesSectionProps) {
	const rowProps = useSettingRowProps(settings, onScopeChange);
	return (
		<div>
			<SectionHeader title={SECTION_TITLES['editor.templates']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<vscode-textarea
						className='monospace'
						rows={12}
						value={String(settings[key]?.value ?? '')}
						onInput={(e: any) => onUpdate(key, (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
			))}
		</div>
	);
}
