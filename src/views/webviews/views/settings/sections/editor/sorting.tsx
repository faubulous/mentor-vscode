import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import { StringListEditor } from '../../components/string-list-editor';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorSortingSection = {
	id: 'editor.sorting',
	label: 'Sorting',
	component: SortingSection,
	defaultScope: 'workspace',
	keys: ['sorting.typeSortingOptions'],
} as const satisfies SettingsSectionDescriptor;

function SortingSection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, ['sorting.typeSortingOptions'], settings, onBulkScope);
	const state = settings['sorting.typeSortingOptions'];
	const opts = (state?.value ?? {}) as {
		typeOrder?: string[];
		predicateOrder?: string[];
		unmatchedPosition?: string;
		unmatchedSort?: string;
	};

	const update = (patch: Partial<typeof opts>) => {
		onUpdate(MENTOR_SETTINGS_SOURCE, 'sorting.typeSortingOptions', { ...opts, ...patch });
	};

	const unmatchedPositionRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => update({ unmatchedPosition: element.value })
	);

	const unmatchedSortRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => update({ unmatchedSort: element.value })
	);

	const unmatchedPositionOptions = state?.nestedEnumOptions?.unmatchedPosition ?? [];
	const unmatchedSortOptions = state?.nestedEnumOptions?.unmatchedSort ?? [];

	// All four rows edit sub-fields of the single `sorting.typeSortingOptions`
	// object, so they share that key's row props: every row shows the setting's
	// real scope and its dropdown moves the whole object between scopes
	// (workspace by default, per the section descriptor).
	const sortingRowProps = rowProps('sorting.typeSortingOptions');

	return (
		<div>
			<SectionHeader title={editorSortingSection.label} menuItems={menuItems} variant="title" />
			<SettingRow {...sortingRowProps}>
				<StringListEditor
					items={opts.typeOrder ?? []}
					placeholder="https://..."
					onChange={v => update({ typeOrder: v })}
				/>
			</SettingRow>
			<SettingRow {...sortingRowProps} label="Predicate order" description="Predicate IRIs for secondary sorting within each type group.">
				<StringListEditor
					items={opts.predicateOrder ?? []}
					placeholder="https://..."
					onChange={v => update({ predicateOrder: v })}
				/>
			</SettingRow>
			<SettingRow {...sortingRowProps} label="Unmatched resource position" description="Where to place resources that do not match any type in the type order list.">
				<vscode-single-select
					ref={unmatchedPositionRef}
					value={opts.unmatchedPosition ?? 'end'}
				>
					{unmatchedPositionOptions.map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow {...sortingRowProps} label="Unmatched resource sort" description="How to sort resources that do not match any type in the type order list.">
				<vscode-single-select
					ref={unmatchedSortRef}
					value={opts.unmatchedSort ?? 'alphabetical'}
				>
					{unmatchedSortOptions.map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}