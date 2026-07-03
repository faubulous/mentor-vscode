import { useMemo } from 'react';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { MENTOR_LANGUAGE_IDS } from '@src/services/document/document-languages';
import { MENTOR_SETTINGS_SOURCE, SettingsSource } from '../../settings-types';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { VSCodeSettings } from '../../settings-types';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorFormattingSection = {
	id: 'editor.formatting',
	label: 'Formatting',
	component: EditorFormattingSection,
	defaultScope: 'workspace',
	keys: [
		'formatting.common.maxLineWidth',
		'formatting.common.spaceBeforePunctuation',
		'formatting.common.blankLinesBetweenSubjects',
		'formatting.sparql.uppercaseKeywords',
		'formatting.sparql.alignPatterns',
		'formatting.sparql.sameBraceLine',
		'formatting.sparql.separateClauses',
	],
	// Language-specific overrides cascade over the common keys. They are configurable
	// via settings.json / VS Code's native settings UI but are not rendered here.
	hiddenKeys: [
		'formatting.turtle.maxLineWidth',
		'formatting.turtle.spaceBeforePunctuation',
		'formatting.turtle.blankLinesBetweenSubjects',
		'formatting.sparql.maxLineWidth',
		'formatting.sparql.spaceBeforePunctuation',
		'formatting.sparql.blankLinesBetweenSubjects',
	],
	vscodeKeys: [
		{ key: 'formatOnSave', label: 'Format on save', description: 'Automatically format documents on save.' },
		{ key: 'tabSize', label: 'Tab size', description: 'Number of spaces per indent level used by the Mentor formatter.' },
		{ key: 'insertSpaces', label: 'Insert spaces', description: 'Use spaces instead of tabs for indentation.' },
		{ key: 'wordWrap', label: 'Word wrap', description: 'Controls how lines wrap in the editor.' },
	],
} as const satisfies SettingsSectionDescriptor;


export interface EditorFormattingSectionProps extends SettingsSectionProps {
	vscodeSettings: VSCodeSettings;
}

export function EditorFormattingSection({
	settings,
	vscodeSettings,
	onUpdate,
	setScope,
	onBulkScope,
}: EditorFormattingSectionProps) {
	// The four built-in editor settings are stored per-language. They are presented
	// once here and applied to every Mentor language at once; 'turtle' is used as the
	// representative slice for display and scope indicators.
	const vscodeSource = useMemo<SettingsSource>(() => ({ kind: 'languageEditor', languageId: 'turtle' }), []);
	const vscodeSlice = vscodeSettings['turtle'] ?? {};

	const updateVscodeAll = (key: string, value: unknown) => {
		for (const languageId of MENTOR_LANGUAGE_IDS) {
			onUpdate({ kind: 'languageEditor', languageId }, key, value);
		}
	};

	const mentorKeys = editorFormattingSection.keys as readonly string[];
	const nonDefaultKeys = mentorKeys.filter(k => settings[k]?.scope !== 'default');

	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const vscodeRowProps = useSettingRowProps(vscodeSource, vscodeSlice, setScope);

	const wordWrapRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => updateVscodeAll('wordWrap', element.value)
	);

	const copyMenuItems = nonDefaultKeys.length > 0 ? [
		{ label: 'Copy all to User', onClick: () => onBulkScope(MENTOR_SETTINGS_SOURCE, nonDefaultKeys, 'user') },
		{ label: 'Copy all to Workspace', onClick: () => onBulkScope(MENTOR_SETTINGS_SOURCE, nonDefaultKeys, 'workspace') },
	] : [];

	return (
		<div>
			<SectionHeader title={editorFormattingSection.label} variant="title" />
			<SettingRow
				{...vscodeRowProps('formatOnSave')}
				label="Format on save"
				description="Automatically format documents on save."
			>
				<vscode-checkbox
					checked={vscodeSlice['formatOnSave']?.value === true}
					onChange={(e: any) => updateVscodeAll('formatOnSave', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				{...vscodeRowProps('tabSize')}
				label="Tab size"
				description="Number of spaces per indent level (used by the Mentor formatter for indentation)."
			>
				<vscode-textfield
					className="setting-input-sm"
					value={String(vscodeSlice['tabSize']?.value ?? 2)}
					type="number"
					onInput={(e: any) => updateVscodeAll('tabSize', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow
				{...vscodeRowProps('insertSpaces')}
				label="Insert spaces"
				description="Use spaces instead of tabs for indentation (used by the Mentor formatter)."
			>
				<vscode-checkbox
					checked={vscodeSlice['insertSpaces']?.value !== false}
					onChange={(e: any) => updateVscodeAll('insertSpaces', (e.target as HTMLInputElement).checked)}
				>
					Use spaces
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				{...vscodeRowProps('wordWrap')}
				label="Word wrap"
				description="Controls how lines wrap in the editor."
			>
				<vscode-single-select
					ref={wordWrapRef}
					value={String(vscodeSlice['wordWrap']?.value ?? 'off')}
				>
					<vscode-option value="off">Off</vscode-option>
					<vscode-option value="on">On</vscode-option>
					<vscode-option value="wordWrapColumn">Word wrap column</vscode-option>
					<vscode-option value="bounded">Bounded</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<div className="settings-subsection">
				<SectionHeader
					title="Common"
					description="Shared formatting options applied to all RDF and SPARQL documents. Each can be overridden per language in settings.json."
					menuItems={copyMenuItems}
					variant="subsection"
				/>
				<SettingRow {...rowProps('formatting.common.maxLineWidth')}>
					<vscode-textfield
						className="setting-input-md"
						value={String(settings['formatting.common.maxLineWidth']?.value ?? 120)}
						type="number"
						onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.common.maxLineWidth', Number((e.target as HTMLInputElement).value))}
					>
						<span slot="content-after" className="setting-input-suffix">chars</span>
					</vscode-textfield>
				</SettingRow>
				<SettingRow {...rowProps('formatting.common.spaceBeforePunctuation')}>
					<vscode-checkbox
						checked={settings['formatting.common.spaceBeforePunctuation']?.value !== false}
						onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.common.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow {...rowProps('formatting.common.blankLinesBetweenSubjects')}>
					<vscode-checkbox
						checked={settings['formatting.common.blankLinesBetweenSubjects']?.value !== false}
						onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.common.blankLinesBetweenSubjects', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
			</div>
			<div className="settings-subsection">
				<SectionHeader
					title="SPARQL"
					description="Formatting options specific to SPARQL documents."
					variant="subsection"
				/>
				<SettingRow {...rowProps('formatting.sparql.uppercaseKeywords')}>
					<vscode-checkbox
						checked={settings['formatting.sparql.uppercaseKeywords']?.value !== false}
						onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.sparql.uppercaseKeywords', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow {...rowProps('formatting.sparql.alignPatterns')}>
					<vscode-checkbox
						checked={settings['formatting.sparql.alignPatterns']?.value !== false}
						onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.sparql.alignPatterns', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow {...rowProps('formatting.sparql.sameBraceLine')}>
					<vscode-checkbox
						checked={settings['formatting.sparql.sameBraceLine']?.value !== false}
						onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.sparql.sameBraceLine', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow {...rowProps('formatting.sparql.separateClauses')}>
					<vscode-checkbox
						checked={settings['formatting.sparql.separateClauses']?.value !== false}
						onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'formatting.sparql.separateClauses', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
			</div>
		</div>
	);
}
