import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { SETTINGS_METADATA, SECTION_TITLES } from '../settings-metadata';

import '@vscode-elements/elements/dist/vscode-textarea';

export interface TemplatesSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function TemplatesSection({ settings, onUpdate, onScopeChange, onBulkScope }: TemplatesSectionProps) {
	const languageTemplateKeys: string[] = [
		'language.sparql.defaultDocumentTemplate',
		'language.sparql.documentQueryTemplate',
		'language.turtle.defaultDocumentTemplate',
		'language.trig.defaultDocumentTemplate',
		'language.n3.defaultDocumentTemplate',
		'language.ntriples.defaultDocumentTemplate',
		'language.nquads.defaultDocumentTemplate',
	];

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['editor.templates']} keys={languageTemplateKeys} settings={settings} onBulkScope={onBulkScope} />
			{languageTemplateKeys.map((key) => (
				<SettingRow
					key={key}
					label={SETTINGS_METADATA[key].title}
					description={SETTINGS_METADATA[key].description}
					settingKey={key}
					settings={settings}
					onScopeChange={onScopeChange}
				>
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
