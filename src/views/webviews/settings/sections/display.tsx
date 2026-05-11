import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';

export interface DisplaySectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function DisplaySection({ settings, onUpdate, onScopeChange, onBulkScope }: DisplaySectionProps) {
	const keys = ['predicates.label', 'predicates.description'];

	return (
		<div>
			<SectionHeader title="Display" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Label predicates"
				description="Ordered list of RDF predicate URIs used to display labels for resources. The first predicate with a value wins."
				settingKey="predicates.label"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['predicates.label']?.value as string[]) ?? []}
					placeholder="https://..."
					onChange={v => onUpdate('predicates.label', v)}
				/>
			</SettingRow>
			<SettingRow
				label="Description predicates"
				description="Ordered list of RDF predicate URIs used to display descriptions for resources."
				settingKey="predicates.description"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['predicates.description']?.value as string[]) ?? []}
					placeholder="https://..."
					onChange={v => onUpdate('predicates.description', v)}
				/>
			</SettingRow>
		</div>
	);
}
