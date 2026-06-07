import { useMemo } from 'react';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { FormattingLanguage } from '@src/services/document/document-languages';
import { SectionHeaderContextMenu } from '@src/views/webviews/components/section-header-context-menu';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE, SettingsSource } from '../../settings-types';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { VSCodeSettings } from '../../settings-types';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorFormattingSection = {
	id: 'editor.formatting',
	label: 'Formatting',
	component: EditorFormattingSection,
	keys: [
		'formatting.turtle.maxLineWidth',
		'formatting.turtle.spaceBeforePunctuation',
		'formatting.turtle.blankLinesBetweenSubjects',
		'formatting.sparql.uppercaseKeywords',
		'formatting.sparql.alignPatterns',
		'formatting.sparql.sameBraceLine',
		'formatting.sparql.separateClauses',
		'formatting.sparql.maxLineWidth',
		'formatting.sparql.spaceBeforePunctuation',
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
	formattingLanguage: FormattingLanguage;
	onFormattingLanguageChange: (lang: FormattingLanguage) => void;
}

export function EditorFormattingSection({
	settings,
	vscodeSettings,
	formattingLanguage,
	onFormattingLanguageChange,
	onUpdate,
	setScope,
	onBulkScope,
}: EditorFormattingSectionProps) {
	const turtleKeys = [
		'formatting.turtle.maxLineWidth',
		'formatting.turtle.spaceBeforePunctuation',
		'formatting.turtle.blankLinesBetweenSubjects',
	];

	const sparqlKeys = [
		'formatting.sparql.maxLineWidth',
		'formatting.sparql.spaceBeforePunctuation',
		'formatting.sparql.uppercaseKeywords',
		'formatting.sparql.alignPatterns',
		'formatting.sparql.sameBraceLine',
		'formatting.sparql.separateClauses',
	];

	const lang = formattingLanguage;
	const isTurtle = lang === 'turtle';
	const langKeys = isTurtle ? turtleKeys : sparqlKeys;
	const nonDefaultLangKeys = langKeys.filter(k => settings[k]?.scope !== 'default');
	const vscodeSource = useMemo<SettingsSource>(() => ({ kind: 'languageEditor', languageId: lang }), [lang]);
	const vscodeSlice = vscodeSettings[lang] ?? {};

	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const vscodeRowProps = useSettingRowProps(vscodeSource, vscodeSlice, setScope);

	const wordWrapRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(vscodeSource, 'wordWrap', element.value)
	);

	return (
		<div>
			<FormSectionHeader title={editorFormattingSection.label} large />
			<SettingRow
				{...vscodeRowProps('formatOnSave')}
				label="Format on save"
				description="Automatically format documents on save."
			>
				<vscode-checkbox
					checked={vscodeSlice['formatOnSave']?.value === true}
					onChange={(e: any) => onUpdate(vscodeSource, 'formatOnSave', (e.target as HTMLInputElement).checked)}
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
					onInput={(e: any) => onUpdate(vscodeSource, 'tabSize', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow
				{...vscodeRowProps('insertSpaces')}
				label="Insert spaces"
				description="Use spaces instead of tabs for indentation (used by the Mentor formatter)."
			>
				<vscode-checkbox
					checked={vscodeSlice['insertSpaces']?.value !== false}
					onChange={(e: any) => onUpdate(vscodeSource, 'insertSpaces', (e.target as HTMLInputElement).checked)}
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
				<div className="lang-tab-bar-row">
					<div className="lang-tab-bar">
						<button
							className={`lang-tab${isTurtle ? ' active' : ''}`}
							onClick={() => onFormattingLanguageChange('turtle')}
						>
							Turtle / TriG / N3
						</button>
						<button
							className={`lang-tab${!isTurtle ? ' active' : ''}`}
							onClick={() => onFormattingLanguageChange('sparql')}
						>
							SPARQL
						</button>
					</div>
					<SectionHeaderContextMenu items={nonDefaultLangKeys.length > 0 ? [
						{ label: 'Copy all to User', onClick: () => onBulkScope(MENTOR_SOURCE, nonDefaultLangKeys, 'user') },
						{ label: 'Copy all to Workspace', onClick: () => onBulkScope(MENTOR_SOURCE, nonDefaultLangKeys, 'workspace') },
					] : []} />
				</div>
				{isTurtle ? (
					<>
						<SettingRow {...rowProps('formatting.turtle.maxLineWidth')}>
							<vscode-textfield
								className="setting-input-md"
								value={String(settings['formatting.turtle.maxLineWidth']?.value ?? 120)}
								type="number"
								onInput={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.turtle.maxLineWidth', Number((e.target as HTMLInputElement).value))}
							>
								<span slot="content-after" className="setting-input-suffix">chars</span>
							</vscode-textfield>
						</SettingRow>
						<SettingRow {...rowProps('formatting.turtle.spaceBeforePunctuation')}>
							<vscode-checkbox
								checked={settings['formatting.turtle.spaceBeforePunctuation']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.turtle.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.turtle.blankLinesBetweenSubjects')}>
							<vscode-checkbox
								checked={settings['formatting.turtle.blankLinesBetweenSubjects']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.turtle.blankLinesBetweenSubjects', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
					</>
				) : (
					<>
						<SettingRow {...rowProps('formatting.sparql.maxLineWidth')}>
							<vscode-textfield
								className="setting-input-md"
								value={String(settings['formatting.sparql.maxLineWidth']?.value ?? 120)}
								type="number"
								onInput={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.sparql.maxLineWidth', Number((e.target as HTMLInputElement).value))}
							>
								<span slot="content-after" className="setting-input-suffix">chars</span>
							</vscode-textfield>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.spaceBeforePunctuation')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.spaceBeforePunctuation']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.sparql.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.uppercaseKeywords')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.uppercaseKeywords']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.sparql.uppercaseKeywords', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.alignPatterns')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.alignPatterns']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.sparql.alignPatterns', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.sameBraceLine')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.sameBraceLine']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.sparql.sameBraceLine', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.separateClauses')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.separateClauses']?.value !== false}
								onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'formatting.sparql.separateClauses', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
					</>
				)}
			</div>
		</div>
	);
}