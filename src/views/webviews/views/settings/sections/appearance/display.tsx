import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { StringListEditor } from '../../components/string-list-editor';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const appearanceDisplaySection = {
	id: 'appearance.display',
	label: 'Display',
	component: DisplaySection,
	defaultScope: 'workspace',
	keys: [
		'predicates.label',
		'predicates.description',
		'tooltips.revealScope'
	],
} as const satisfies SettingsSectionDescriptor;

/**
 * The settings of the section that are lists of predicates.
 */
const PREDICATE_KEYS = ['predicates.label', 'predicates.description'] as const;

/**
 * How resources are shown: the predicates of their labels and descriptions, and where the links
 * of their tooltips go.
 */
function DisplaySection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);
	const revealScopeRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SETTINGS_SOURCE, 'tooltips.revealScope', element.value)
	);

	return (
		<div>
			<SectionHeader title={appearanceDisplaySection.label} menuItems={menuItems} variant="title" />
			{PREDICATE_KEYS.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<StringListEditor
						items={(settings[key]?.value as string[]) ?? []}
						placeholder="https://..."
						onChange={v => onUpdate(MENTOR_SETTINGS_SOURCE, key, v)}
					/>
				</SettingRow>
			))}
			<SettingRow {...rowProps('tooltips.revealScope')}>
				<vscode-single-select
					ref={revealScopeRef}
					value={String(settings['tooltips.revealScope']?.value ?? 'workspace')}
				>
					{(settings['tooltips.revealScope']?.enumOptions ?? []).map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}