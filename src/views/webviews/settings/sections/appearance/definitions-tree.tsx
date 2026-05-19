import { VscodeSingleSelect } from '@vscode-elements/elements';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { SettingsSectionProps } from '../../settings-section-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function DefinitionsTreeSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems([...keys], settings, onBulkScope);

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
			<FormSectionHeader title={definitionsTreeDescriptor.label} menuItems={menuItems} large />
			<SettingRow {...rowProps('definitionTree.labelStyle')}>
				<vscode-single-select
					ref={labelStyleRef}
					value={String(settings['definitionTree.labelStyle']?.value ?? 'AnnotatedLabels')}
				>
					{(settings['definitionTree.labelStyle']?.enumOptions ?? []).map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow {...rowProps('definitionTree.defaultLayout')}>
				<vscode-single-select
					ref={defaultLayoutRef}
					value={String(settings['definitionTree.defaultLayout']?.value ?? 'GroupByType')}
				>
					{(settings['definitionTree.defaultLayout']?.enumOptions ?? []).map(o => (
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
					{(settings['definitionTree.decorateMissingLanguageTags']?.enumOptions ?? []).map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}

export const definitionsTreeDescriptor = {
	id: 'appearance.definitions-tree',
	group: 'appearance',
	label: 'Definitions Tree',
	component: DefinitionsTreeSection,
	keys: [
		'definitionTree.labelStyle',
		'definitionTree.defaultLayout',
		'definitionTree.defaultLanguageTag',
		'definitionTree.decorateMissingLanguageTags',
	],
} as const satisfies SettingsSectionDescriptor;
