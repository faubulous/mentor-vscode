import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { StringListEditor } from '../../components/string-list-editor';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function SortingSection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(['sorting.typeSortingOptions'], settings, onBulkScope);
	const state = settings['sorting.typeSortingOptions'];
	const opts = (state?.value ?? {}) as {
		typeOrder?: string[];
		predicateOrder?: string[];
		unmatchedPosition?: string;
		unmatchedSort?: string;
	};

	const update = (patch: Partial<typeof opts>) => {
		onUpdate('sorting.typeSortingOptions', { ...opts, ...patch });
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

	return (
		<div>
			<FormSectionHeader title={editorSortingDescriptor.label} menuItems={menuItems} large />
			<SettingRow {...rowProps('sorting.typeSortingOptions')}>
				<StringListEditor
					items={opts.typeOrder ?? []}
					placeholder="https://..."
					onChange={v => update({ typeOrder: v })}
				/>
			</SettingRow>
			<SettingRow label="Predicate order" description="Predicate IRIs for secondary sorting within each type group." state={undefined} setScope={() => {}}>
				<StringListEditor
					items={opts.predicateOrder ?? []}
					placeholder="https://..."
					onChange={v => update({ predicateOrder: v })}
				/>
			</SettingRow>
			<SettingRow label="Unmatched resource position" description="Where to place resources that do not match any type in the type order list." state={undefined} setScope={() => {}}>
				<vscode-single-select
					ref={unmatchedPositionRef}
					value={opts.unmatchedPosition ?? 'end'}
				>
					{unmatchedPositionOptions.map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow label="Unmatched resource sort" description="How to sort resources that do not match any type in the type order list." state={undefined} setScope={() => {}}>
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

export const editorSortingDescriptor = {
	id: 'editor.sorting',
	group: 'editor',
	label: 'Sorting',
	component: SortingSection,
	keys: ['sorting.typeSortingOptions'],
} as const satisfies SettingsSectionDescriptor;
