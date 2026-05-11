import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';

import '@vscode-elements/elements/dist/vscode-single-select';
import '@vscode-elements/elements/dist/vscode-option';

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

	return (
		<div>
			<SectionHeader title="Sorting" keys={['sorting.typeSortingOptions']} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Type order"
				description="RDF type IRIs in priority order. Resources of the first listed type appear first when sorting documents by type."
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
						value={opts.unmatchedPosition ?? 'end'}
						onChange={(e: any) => update({ unmatchedPosition: (e.target as HTMLSelectElement).value })}
					>
						<vscode-option value="start">Start</vscode-option>
						<vscode-option value="end">End</vscode-option>
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
						value={opts.unmatchedSort ?? 'alphabetical'}
						onChange={(e: any) => update({ unmatchedSort: (e.target as HTMLSelectElement).value })}
					>
						<vscode-option value="alphabetical">Alphabetical</vscode-option>
						<vscode-option value="none">None</vscode-option>
					</vscode-single-select>
				</div>
			</div>
		</div>
	);
}
