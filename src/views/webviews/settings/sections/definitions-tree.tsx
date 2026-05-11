import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { SETTINGS_METADATA, SECTION_TITLES } from '../settings-metadata';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

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

	const labelStyleRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate('definitionTree.labelStyle', element.value)
	);

	const defaultLayoutRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate('definitionTree.defaultLayout', element.value)
	);

	const decorateMissingRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate('definitionTree.decorateMissingLanguageTags', element.value)
	);

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['appearance.definitions-tree']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label={SETTINGS_METADATA['definitionTree.labelStyle'].title}
				description={SETTINGS_METADATA['definitionTree.labelStyle'].description}
				settingKey="definitionTree.labelStyle"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={labelStyleRef}
					value={String(settings['definitionTree.labelStyle']?.value ?? 'AnnotatedLabels')}
				>
					<vscode-option value="AnnotatedLabels">Annotated labels</vscode-option>
					<vscode-option value="UriLabels">URI labels</vscode-option>
					<vscode-option value="UriLabelsWithPrefix">URI labels with prefix</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label={SETTINGS_METADATA['definitionTree.defaultLayout'].title}
				description={SETTINGS_METADATA['definitionTree.defaultLayout'].description}
				settingKey="definitionTree.defaultLayout"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={defaultLayoutRef}
					value={String(settings['definitionTree.defaultLayout']?.value ?? 'GroupByType')}
				>
					<vscode-option value="GroupByType">Group by type</vscode-option>
					<vscode-option value="GroupBySource">Group by source</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label={SETTINGS_METADATA['definitionTree.defaultLanguageTag'].title}
				description={SETTINGS_METADATA['definitionTree.defaultLanguageTag'].description}
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
				label={SETTINGS_METADATA['definitionTree.decorateMissingLanguageTags'].title}
				description={SETTINGS_METADATA['definitionTree.decorateMissingLanguageTags'].description}
				settingKey="definitionTree.decorateMissingLanguageTags"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={decorateMissingRef}
					value={String(settings['definitionTree.decorateMissingLanguageTags']?.value ?? 'Disabled')}
				>
					<vscode-option value="Disabled">Disabled</vscode-option>
					<vscode-option value="All">All</vscode-option>
					<vscode-option value="Document">Document only</vscode-option>
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}
