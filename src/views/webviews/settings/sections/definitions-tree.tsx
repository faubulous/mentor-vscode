import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { SECTION_TITLES, getEnumOptions } from '../settings-metadata';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

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
				label={settings['definitionTree.labelStyle']?.title ?? ''}
				description={settings['definitionTree.labelStyle']?.description ?? ''}
				settingKey="definitionTree.labelStyle"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={labelStyleRef}
					value={String(settings['definitionTree.labelStyle']?.value ?? 'AnnotatedLabels')}
				>
					{getEnumOptions('definitionTree.labelStyle').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label={settings['definitionTree.defaultLayout']?.title ?? ''}
				description={settings['definitionTree.defaultLayout']?.description ?? ''}
				settingKey="definitionTree.defaultLayout"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={defaultLayoutRef}
					value={String(settings['definitionTree.defaultLayout']?.value ?? 'GroupByType')}
				>
					{getEnumOptions('definitionTree.defaultLayout').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label={settings['definitionTree.defaultLanguageTag']?.title ?? ''}
				description={settings['definitionTree.defaultLanguageTag']?.description ?? ''}
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
				label={settings['definitionTree.decorateMissingLanguageTags']?.title ?? ''}
				description={settings['definitionTree.decorateMissingLanguageTags']?.description ?? ''}
				settingKey="definitionTree.decorateMissingLanguageTags"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={decorateMissingRef}
					value={String(settings['definitionTree.decorateMissingLanguageTags']?.value ?? 'Disabled')}
				>
					{getEnumOptions('definitionTree.decorateMissingLanguageTags').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}
