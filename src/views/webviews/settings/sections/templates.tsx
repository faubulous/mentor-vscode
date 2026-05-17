import { SettingScope, SettingState } from '../settings-types';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../components/use-bulk-scope-menu-items';
import { SECTION_TITLES } from '../settings-metadata';

export interface TemplatesSectionProps {
	keys: string[];
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function TemplatesSection({ keys, settings, onUpdate, setScope, onBulkScope }: TemplatesSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(keys, settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader title={SECTION_TITLES['editor.templates']} menuItems={menuItems} large />
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
