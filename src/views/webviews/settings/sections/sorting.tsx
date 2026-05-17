import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-types';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../components/use-bulk-scope-menu-items';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES, getNestedEnumOptions } from '../settings-metadata';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

export interface SortingSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function SortingSection({ settings, onUpdate, setScope, onBulkScope }: SortingSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(['sorting.typeSortingOptions'], settings, onBulkScope);
	const opts = (settings['sorting.typeSortingOptions']?.value ?? {}) as {
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

	return (
		<div>
			<FormSectionHeader title={SECTION_TITLES['editor.sorting']} menuItems={menuItems} large />
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
					{getNestedEnumOptions('sorting.typeSortingOptions', 'unmatchedPosition').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow label="Unmatched resource sort" description="How to sort resources that do not match any type in the type order list." state={undefined} setScope={() => {}}>
				<vscode-single-select
					ref={unmatchedSortRef}
					value={opts.unmatchedSort ?? 'alphabetical'}
				>
					{getNestedEnumOptions('sorting.typeSortingOptions', 'unmatchedSort').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}
