import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES, getNestedEnumOptions } from '../settings-metadata';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

export interface SortingSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function SortingSection({ settings, onUpdate, onScopeChange, onBulkScope }: SortingSectionProps) {
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
			<SectionHeader title={SECTION_TITLES['editor.sorting']} keys={['sorting.typeSortingOptions']} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label={settings['sorting.typeSortingOptions']?.title ?? ''}
				description={settings['sorting.typeSortingOptions']?.description ?? ''}
				settingKey="sorting.typeSortingOptions"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={opts.typeOrder ?? []}
					placeholder="https://..."
					onChange={v => update({ typeOrder: v })}
				/>
			</SettingRow>
			<div className="setting-row">
				<div className="setting-row-header">
					<span className="setting-label">Predicate order</span>
				</div>
				<p className="setting-description">Predicate IRIs for secondary sorting within each type group.</p>
				<div className="setting-control">
					<StringListEditor
						items={opts.predicateOrder ?? []}
						placeholder="https://..."
						onChange={v => update({ predicateOrder: v })}
					/>
				</div>
			</div>
			<div className="setting-row">
				<div className="setting-row-header">
					<span className="setting-label">Unmatched resource position</span>
				</div>
				<p className="setting-description">Where to place resources that do not match any type in the type order list.</p>
				<div className="setting-control">
					<vscode-single-select
						ref={unmatchedPositionRef}
						value={opts.unmatchedPosition ?? 'end'}
					>
						{getNestedEnumOptions('sorting.typeSortingOptions', 'unmatchedPosition').map(o => (
							<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
						))}
					</vscode-single-select>
				</div>
			</div>
			<div className="setting-row">
				<div className="setting-row-header">
					<span className="setting-label">Unmatched resource sort</span>
				</div>
				<p className="setting-description">How to sort resources that do not match any type in the type order list.</p>
				<div className="setting-control">
					<vscode-single-select
						ref={unmatchedSortRef}
						value={opts.unmatchedSort ?? 'alphabetical'}
					>
						{getNestedEnumOptions('sorting.typeSortingOptions', 'unmatchedSort').map(o => (
							<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
						))}
					</vscode-single-select>
				</div>
			</div>
		</div>
	);
}
