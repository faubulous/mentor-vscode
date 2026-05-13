import { VscodeSingleSelect } from '@vscode-elements/elements';
import { LanguageId, FormattingLanguage } from '@src/services/document/document-factory';
import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SectionHeaderContextMenu } from '../components/section-header-context-menu';
import { SettingRow } from '../components/setting-row';
import { SettingsScopeContext } from '../components/setting-context';
import { useSettingRowProps, useVSCodeSettingRowProps } from '../components/use-setting-row-props';
import { VSCodeSettings } from '../components/types';
import { SECTION_TITLES } from '../settings-metadata';
import { useContext } from 'react';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

export interface FormattingSectionProps {
	settings: Record<string, SettingState>;
	vscodeSettings: VSCodeSettings;
	formattingLanguage: FormattingLanguage;
	onFormattingLanguageChange: (lang: FormattingLanguage) => void;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onVSCodeUpdate: (languageId: LanguageId, key: string, value: unknown) => void;
	onVSCodeScopeChange: (languageId: LanguageId, key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function FormattingSection({
	settings,
	vscodeSettings,
	formattingLanguage,
	onFormattingLanguageChange,
	onUpdate,
	setScope,
	onVSCodeUpdate,
	onVSCodeScopeChange,
	onBulkScope,
}: FormattingSectionProps) {
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
	const activeScope = useContext(SettingsScopeContext);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const rowProps = useSettingRowProps(settings, setScope);
	const vscodeRowProps = useVSCodeSettingRowProps(vscodeSettings, lang, onVSCodeScopeChange);

	const wordWrapRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onVSCodeUpdate(lang, 'wordWrap', element.value)
	);

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['editor.formatting']} />
			<SettingRow
				{...vscodeRowProps('formatOnSave')}
				label="Format on save"
				description="Automatically format documents on save."
			>
				<vscode-checkbox
					checked={vscodeSettings[lang]?.['formatOnSave']?.value === true}
					onChange={(e: any) => onVSCodeUpdate(lang, 'formatOnSave', (e.target as HTMLInputElement).checked)}
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
					value={String(vscodeSettings[lang]?.['tabSize']?.value ?? 2)}
					type="number"
					onInput={(e: any) => onVSCodeUpdate(lang, 'tabSize', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>

			<SettingRow
				{...vscodeRowProps('insertSpaces')}
				label="Insert spaces"
				description="Use spaces instead of tabs for indentation (used by the Mentor formatter)."
			>
				<vscode-checkbox
					checked={vscodeSettings[lang]?.['insertSpaces']?.value !== false}
					onChange={(e: any) => onVSCodeUpdate(lang, 'insertSpaces', (e.target as HTMLInputElement).checked)}
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
					value={String(vscodeSettings[lang]?.['wordWrap']?.value ?? 'off')}
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
						{ label: `Copy all to ${otherScopeLabel}`, onClick: () => onBulkScope(nonDefaultLangKeys, otherScope) },
					] : []} />
				</div>

				{isTurtle ? (
					<>
						<SettingRow {...rowProps('formatting.turtle.maxLineWidth')}>
							<vscode-textfield
								value={String(settings['formatting.turtle.maxLineWidth']?.value ?? 120)}
								type="number"
								onInput={(e: any) => onUpdate('formatting.turtle.maxLineWidth', Number((e.target as HTMLInputElement).value))}
							/>
						</SettingRow>
						<SettingRow {...rowProps('formatting.turtle.spaceBeforePunctuation')}>
							<vscode-checkbox
								checked={settings['formatting.turtle.spaceBeforePunctuation']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.turtle.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.turtle.blankLinesBetweenSubjects')}>
							<vscode-checkbox
								checked={settings['formatting.turtle.blankLinesBetweenSubjects']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.turtle.blankLinesBetweenSubjects', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
					</>
				) : (
					<>
						<SettingRow {...rowProps('formatting.sparql.maxLineWidth')}>
							<vscode-textfield
								value={String(settings['formatting.sparql.maxLineWidth']?.value ?? 120)}
								type="number"
								onInput={(e: any) => onUpdate('formatting.sparql.maxLineWidth', Number((e.target as HTMLInputElement).value))}
							/>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.spaceBeforePunctuation')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.spaceBeforePunctuation']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.uppercaseKeywords')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.uppercaseKeywords']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.uppercaseKeywords', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.alignPatterns')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.alignPatterns']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.alignPatterns', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.sameBraceLine')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.sameBraceLine']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.sameBraceLine', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow {...rowProps('formatting.sparql.separateClauses')}>
							<vscode-checkbox
								checked={settings['formatting.sparql.separateClauses']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.separateClauses', (e.target as HTMLInputElement).checked)}
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
