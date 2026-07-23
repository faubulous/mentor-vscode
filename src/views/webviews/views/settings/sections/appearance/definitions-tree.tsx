import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const appearanceDefinitionsTreeSection = {
	id: 'appearance.definitions-tree',
	label: 'Definitions Tree',
	component: DefinitionsTreeSection,
	keys: [
		'definitionTree.labelStyle',
		'definitionTree.defaultLayout',
		'definitionTree.defaultLanguageTag',
		'definitionTree.decorateMissingLanguageTags',
	],
} as const satisfies SettingsSectionDescriptor;

function DefinitionsTreeSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

	const labelStyleRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'definitionTree.labelStyle', element.value)
	);

	const defaultLayoutRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'definitionTree.defaultLayout', element.value)
	);

	const decorateMissingRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'definitionTree.decorateMissingLanguageTags', element.value)
	);

	return (
		<div>
			<SectionHeader title={appearanceDefinitionsTreeSection.label} menuItems={menuItems} variant="title" />
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
					className="setting-input-sm"
					value={String(settings['definitionTree.defaultLanguageTag']?.value ?? '')}
					placeholder="en"
					onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'definitionTree.defaultLanguageTag', (e.target as HTMLInputElement).value)}
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