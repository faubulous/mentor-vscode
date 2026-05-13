import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
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

	const rowProps = useSettingRowProps(settings, onScopeChange);

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
			<SettingRow {...rowProps('definitionTree.labelStyle')}>
				<vscode-single-select
					ref={labelStyleRef}
					value={String(settings['definitionTree.labelStyle']?.value ?? 'AnnotatedLabels')}
				>
					{getEnumOptions('definitionTree.labelStyle').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow {...rowProps('definitionTree.defaultLayout')}>
				<vscode-single-select
					ref={defaultLayoutRef}
					value={String(settings['definitionTree.defaultLayout']?.value ?? 'GroupByType')}
				>
					{getEnumOptions('definitionTree.defaultLayout').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow {...rowProps('definitionTree.defaultLanguageTag')}>
				<vscode-textfield
					value={String(settings['definitionTree.defaultLanguageTag']?.value ?? '')}
					placeholder="en"
					onInput={(e: any) => onUpdate('definitionTree.defaultLanguageTag', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
			<SettingRow {...rowProps('definitionTree.decorateMissingLanguageTags')}>
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
