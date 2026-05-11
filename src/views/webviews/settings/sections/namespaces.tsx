import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { ObjectListEditor } from '../components/object-list-editor';

export interface NamespacesSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function NamespacesSection({ settings, onUpdate, onScopeChange, onBulkScope }: NamespacesSectionProps) {
	const namespaces = (settings['namespaces']?.value as { uri: string; defaultPrefix: string }[]) ?? [];

	return (
		<div>
			<SectionHeader title="Namespaces" keys={['namespaces']} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Namespace prefixes"
				description="Custom namespace URI and prefix pairs available for prefix completion and auto-definition."
				settingKey="namespaces"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<ObjectListEditor
					items={namespaces}
					fields={[
						{ key: 'defaultPrefix', label: 'Prefix', placeholder: 'ex', className: 'col-prefix' },
						{ key: 'uri', label: 'URI', placeholder: 'https://example.org/' },
					]}
					onChange={v => onUpdate('namespaces', v)}
				/>
			</SettingRow>
		</div>
	);
}
