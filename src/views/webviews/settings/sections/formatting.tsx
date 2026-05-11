import { SettingScope, SettingState, LanguageId, FormattingLanguage } from '../settings-panel-messages';
import { SectionHeader, SettingRow, EditorSettingRow, MoreVertMenu } from '../components/setting-row';
import { EditorSettings } from '../components/types';

import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-textfield';
import '@vscode-elements/elements/dist/vscode-single-select';
import '@vscode-elements/elements/dist/vscode-option';

export interface FormattingSectionProps {
	settings: Record<string, SettingState>;
	editorSettings: EditorSettings;
	formattingLanguage: FormattingLanguage;
	onFormattingLanguageChange: (lang: FormattingLanguage) => void;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onEditorUpdate: (languageId: LanguageId, key: string, value: unknown) => void;
	onEditorScopeChange: (languageId: LanguageId, key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function FormattingSection({
	settings,
	editorSettings,
	formattingLanguage,
	onFormattingLanguageChange,
	onUpdate,
	onScopeChange,
	onEditorUpdate,
	onEditorScopeChange,
	onBulkScope,
}: FormattingSectionProps) {
	const turtleKeys = [
		'formatting.turtle.maxLineWidth',
		'formatting.turtle.spaceBeforePunctuation',
		'formatting.turtle.blankLinesBetweenSubjects',
	];
	const sparqlKeys = [
		'formatting.sparql.uppercaseKeywords',
		'formatting.sparql.alignPatterns',
		'formatting.sparql.sameBraceLine',
		'formatting.sparql.separateClauses',
		'formatting.sparql.maxLineWidth',
		'formatting.sparql.spaceBeforePunctuation',
	];
	const lang = formattingLanguage;
	const isTurtle = lang === 'turtle';
	const langKeys = isTurtle ? turtleKeys : sparqlKeys;
	const nonDefaultLangKeys = langKeys.filter(k => settings[k]?.source !== 'default');

	return (
		<div>
			<SectionHeader title="Formatting" />

			<div className="settings-subsection">
				<div className="settings-subsection-title">VS Code Editor Options</div>
				<EditorSettingRow
					label="Format on save"
					description="Automatically format documents on save."
					settingKey="formatOnSave"
					languageId={lang}
					editorSettings={editorSettings}
					onScopeChange={onEditorScopeChange}
				>
					<vscode-checkbox
						checked={editorSettings[lang]?.['formatOnSave']?.value === true}
						onChange={(e: any) => onEditorUpdate(lang, 'formatOnSave', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</EditorSettingRow>
				<EditorSettingRow
					label="Tab size"
					description="Number of spaces per indent level (used by the Mentor formatter for indentation)."
					settingKey="tabSize"
					languageId={lang}
					editorSettings={editorSettings}
					onScopeChange={onEditorScopeChange}
				>
					<vscode-textfield
						value={String(editorSettings[lang]?.['tabSize']?.value ?? 2)}
						type="number"
						onInput={(e: any) => onEditorUpdate(lang, 'tabSize', Number((e.target as HTMLInputElement).value))}
					/>
				</EditorSettingRow>
				<EditorSettingRow
					label="Insert spaces"
					description="Use spaces instead of tabs for indentation (used by the Mentor formatter)."
					settingKey="insertSpaces"
					languageId={lang}
					editorSettings={editorSettings}
					onScopeChange={onEditorScopeChange}
				>
					<vscode-checkbox
						checked={editorSettings[lang]?.['insertSpaces']?.value !== false}
						onChange={(e: any) => onEditorUpdate(lang, 'insertSpaces', (e.target as HTMLInputElement).checked)}
					>
						Use spaces
					</vscode-checkbox>
				</EditorSettingRow>
				<EditorSettingRow
					label="Word wrap"
					description="Controls how lines wrap in the editor."
					settingKey="wordWrap"
					languageId={lang}
					editorSettings={editorSettings}
					onScopeChange={onEditorScopeChange}
				>
					<vscode-single-select
						value={String(editorSettings[lang]?.['wordWrap']?.value ?? 'off')}
						onChange={(e: any) => onEditorUpdate(lang, 'wordWrap', (e.target as HTMLSelectElement).value)}
					>
						<vscode-option value="off">Off</vscode-option>
						<vscode-option value="on">On</vscode-option>
						<vscode-option value="wordWrapColumn">Word wrap column</vscode-option>
						<vscode-option value="bounded">Bounded</vscode-option>
					</vscode-single-select>
				</EditorSettingRow>
			</div>

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
					<MoreVertMenu items={nonDefaultLangKeys.length > 0 ? [
						{ label: 'Copy all to User', onClick: () => onBulkScope(nonDefaultLangKeys, 'user') },
						{ label: 'Copy all to Workspace', onClick: () => onBulkScope(nonDefaultLangKeys, 'workspace') },
					] : []} />
				</div>

				{isTurtle ? (
					<>
						<SettingRow
							label="Max line width"
							description="Maximum line width before the formatter wraps long lines. Set to 0 to disable."
							settingKey="formatting.turtle.maxLineWidth"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-textfield
								value={String(settings['formatting.turtle.maxLineWidth']?.value ?? 120)}
								type="number"
								onInput={(e: any) => onUpdate('formatting.turtle.maxLineWidth', Number((e.target as HTMLInputElement).value))}
							/>
						</SettingRow>
						<SettingRow
							label="Space before punctuation"
							description="Insert a space before statement-ending punctuation characters (. ; ,)."
							settingKey="formatting.turtle.spaceBeforePunctuation"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-checkbox
								checked={settings['formatting.turtle.spaceBeforePunctuation']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.turtle.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow
							label="Blank lines between subjects"
							description="Insert a blank line between each top-level subject block."
							settingKey="formatting.turtle.blankLinesBetweenSubjects"
							settings={settings}
							onScopeChange={onScopeChange}
						>
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
						<SettingRow
							label="Uppercase keywords"
							description="Format SPARQL keywords (SELECT, WHERE, etc.) in uppercase."
							settingKey="formatting.sparql.uppercaseKeywords"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-checkbox
								checked={settings['formatting.sparql.uppercaseKeywords']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.uppercaseKeywords', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow
							label="Align patterns"
							description="Align triple patterns in the WHERE clause."
							settingKey="formatting.sparql.alignPatterns"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-checkbox
								checked={settings['formatting.sparql.alignPatterns']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.alignPatterns', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow
							label="Opening brace on same line"
							description="Place opening braces on the same line as SPARQL keywords."
							settingKey="formatting.sparql.sameBraceLine"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-checkbox
								checked={settings['formatting.sparql.sameBraceLine']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.sameBraceLine', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow
							label="Separate clauses"
							description="Insert blank lines between major SPARQL clauses (SELECT, WHERE, etc.)."
							settingKey="formatting.sparql.separateClauses"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-checkbox
								checked={settings['formatting.sparql.separateClauses']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.separateClauses', (e.target as HTMLInputElement).checked)}
							>
								Enabled
							</vscode-checkbox>
						</SettingRow>
						<SettingRow
							label="Max line width"
							description="Maximum line width before the formatter wraps long lines. Set to 0 to disable."
							settingKey="formatting.sparql.maxLineWidth"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-textfield
								value={String(settings['formatting.sparql.maxLineWidth']?.value ?? 120)}
								type="number"
								onInput={(e: any) => onUpdate('formatting.sparql.maxLineWidth', Number((e.target as HTMLInputElement).value))}
							/>
						</SettingRow>
						<SettingRow
							label="Space before punctuation"
							description="Insert a space before punctuation characters."
							settingKey="formatting.sparql.spaceBeforePunctuation"
							settings={settings}
							onScopeChange={onScopeChange}
						>
							<vscode-checkbox
								checked={settings['formatting.sparql.spaceBeforePunctuation']?.value !== false}
								onChange={(e: any) => onUpdate('formatting.sparql.spaceBeforePunctuation', (e.target as HTMLInputElement).checked)}
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
