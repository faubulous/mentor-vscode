import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';

import '@vscode-elements/elements/dist/vscode-textarea';

export interface TemplatesSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function TemplatesSection({ settings, onUpdate, onScopeChange, onBulkScope }: TemplatesSectionProps) {
	const languageTemplateKeys: { key: string; label: string }[] = [
		{ key: 'language.sparql.defaultDocumentTemplate', label: 'SPARQL' },
		{ key: 'language.sparql.documentQueryTemplate', label: 'SPARQL query (from document)' },
		{ key: 'language.turtle.defaultDocumentTemplate', label: 'Turtle' },
		{ key: 'language.trig.defaultDocumentTemplate', label: 'TriG' },
		{ key: 'language.n3.defaultDocumentTemplate', label: 'N3' },
		{ key: 'language.ntriples.defaultDocumentTemplate', label: 'N-Triples' },
		{ key: 'language.nquads.defaultDocumentTemplate', label: 'N-Quads' },
	];

	return (
		<div>
			<SectionHeader title="Templates" keys={languageTemplateKeys.map(t => t.key)} settings={settings} onBulkScope={onBulkScope} />
			{languageTemplateKeys.map(({ key, label }) => (
				<SettingRow
					key={key}
					label={`${label} document template`}
					description={`Default content for new ${label} documents.`}
					settingKey={key}
					settings={settings}
					onScopeChange={onScopeChange}
				>
					<vscode-textarea
						className="editor-font-textarea"
						value={String(settings[key]?.value ?? '')}
						rows={4}
						onInput={(e: any) => onUpdate(key, (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
			))}
		</div>
	);
}
