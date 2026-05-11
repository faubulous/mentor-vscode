import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';

import '@vscode-elements/elements/dist/vscode-single-select';
import '@vscode-elements/elements/dist/vscode-option';
import '@vscode-elements/elements/dist/vscode-textfield';

export interface DefinitionsTreeSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function DefinitionsTreeSection({ settings, onUpdate, onScopeChange, onBulkScope }: DefinitionsTreeSectionProps) {
	const keys = [
		'definitionTree.labelStyle',
		'definitionTree.defaultLayout',
		'definitionTree.defaultLanguageTag',
		'definitionTree.decorateMissingLanguageTags',
	];

	return (
		<div>
			<SectionHeader title="Definitions Tree" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Label style"
				description="Controls how labels are displayed in the definitions tree."
				settingKey="definitionTree.labelStyle"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['definitionTree.labelStyle']?.value ?? 'AnnotatedLabels')}
					onChange={(e: any) => onUpdate('definitionTree.labelStyle', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="AnnotatedLabels">Annotated labels</vscode-option>
					<vscode-option value="UriLabels">URI labels</vscode-option>
					<vscode-option value="UriLabelsWithPrefix">URI labels with prefix</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label="Default layout"
				description="How to group resources in the definitions tree."
				settingKey="definitionTree.defaultLayout"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['definitionTree.defaultLayout']?.value ?? 'GroupByType')}
					onChange={(e: any) => onUpdate('definitionTree.defaultLayout', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="GroupByType">Group by type</vscode-option>
					<vscode-option value="GroupBySource">Group by source</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label="Default language tag"
				description="Filter labels and descriptions by this language tag (e.g. 'en', 'de')."
				settingKey="definitionTree.defaultLanguageTag"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['definitionTree.defaultLanguageTag']?.value ?? '')}
					placeholder="en"
					onInput={(e: any) => onUpdate('definitionTree.defaultLanguageTag', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label="Decorate missing language tags"
				description="Highlight resources that are missing a label or description in the default language."
				settingKey="definitionTree.decorateMissingLanguageTags"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['definitionTree.decorateMissingLanguageTags']?.value ?? 'Disabled')}
					onChange={(e: any) => onUpdate('definitionTree.decorateMissingLanguageTags', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="Disabled">Disabled</vscode-option>
					<vscode-option value="All">All</vscode-option>
					<vscode-option value="Document">Document only</vscode-option>
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}
