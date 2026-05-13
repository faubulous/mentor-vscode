import { VscodeSingleSelect } from '@vscode-elements/elements';
import { LanguageId, FormattingLanguage } from '@src/services/document/document-factory';
import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SectionHeaderContextMenu } from '../components/section-header-context-menu';
import { SettingRow } from '../components/setting-row';
import { VSCodeSettingRow, SettingsScopeContext } from '../components/setting-row';
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
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
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
	onScopeChange,
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
	const nonDefaultLangKeys = langKeys.filter(k => settings[k]?.source !== 'default');
	const activeScope = useContext(SettingsScopeContext);
	const otherScope: 'user' | 'workspace' = activeScope === 'user' ? 'workspace' : 'user';
	const otherScopeLabel = activeScope === 'user' ? 'Workspace' : 'User';

	const wordWrapRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onVSCodeUpdate(lang, 'wordWrap', element.value)
	);

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['editor.formatting']} />
			<VSCodeSettingRow
				label="Format on save"
				description="Automatically format documents on save."
				settingKey="formatOnSave"
				languageId={lang}
				vscodeSettings={vscodeSettings}
				onScopeChange={onVSCodeScopeChange}
			>
				<vscode-checkbox
					checked={vscodeSettings[lang]?.['formatOnSave']?.value === true}
					onChange={(e: any) => onVSCodeUpdate(lang, 'formatOnSave', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</VSCodeSettingRow>

			<VSCodeSettingRow
				label="Tab size"
				description="Number of spaces per indent level (used by the Mentor formatter for indentation)."
				settingKey="tabSize"
				languageId={lang}
				vscodeSettings={vscodeSettings}
				onScopeChange={onVSCodeScopeChange}
			>
				<vscode-textfield
					value={String(vscodeSettings[lang]?.['tabSize']?.value ?? 2)}
					type="number"
					onInput={(e: any) => onVSCodeUpdate(lang, 'tabSize', Number((e.target as HTMLInputElement).value))}
				/>
			</VSCodeSettingRow>

			<VSCodeSettingRow
				label="Insert spaces"
				description="Use spaces instead of tabs for indentation (used by the Mentor formatter)."
				settingKey="insertSpaces"
				languageId={lang}
				vscodeSettings={vscodeSettings}
				onScopeChange={onVSCodeScopeChange}
			>
				<vscode-checkbox
					checked={vscodeSettings[lang]?.['insertSpaces']?.value !== false}
					onChange={(e: any) => onVSCodeUpdate(lang, 'insertSpaces', (e.target as HTMLInputElement).checked)}
				>
					Use spaces
				</vscode-checkbox>
			</VSCodeSettingRow>

			<VSCodeSettingRow
				label="Word wrap"
				description="Controls how lines wrap in the editor."
				settingKey="wordWrap"
				languageId={lang}
				vscodeSettings={vscodeSettings}
				onScopeChange={onVSCodeScopeChange}
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
			</VSCodeSettingRow>

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
						<SettingRow
							label={settings['formatting.turtle.maxLineWidth']?.title ?? ''}
							description={settings['formatting.turtle.maxLineWidth']?.description ?? ''}
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
							label={settings['formatting.turtle.spaceBeforePunctuation']?.title ?? ''}
							description={settings['formatting.turtle.spaceBeforePunctuation']?.description ?? ''}
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
							label={settings['formatting.turtle.blankLinesBetweenSubjects']?.title ?? ''}
							description={settings['formatting.turtle.blankLinesBetweenSubjects']?.description ?? ''}
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
							label={settings['formatting.sparql.maxLineWidth']?.title ?? ''}
							description={settings['formatting.sparql.maxLineWidth']?.description ?? ''}
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
							label={settings['formatting.sparql.spaceBeforePunctuation']?.title ?? ''}
							description={settings['formatting.sparql.spaceBeforePunctuation']?.description ?? ''}
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
						<SettingRow
							label={settings['formatting.sparql.uppercaseKeywords']?.title ?? ''}
							description={settings['formatting.sparql.uppercaseKeywords']?.description ?? ''}
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
							label={settings['formatting.sparql.alignPatterns']?.title ?? ''}
							description={settings['formatting.sparql.alignPatterns']?.description ?? ''}
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
							label={settings['formatting.sparql.sameBraceLine']?.title ?? ''}
							description={settings['formatting.sparql.sameBraceLine']?.description ?? ''}
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
							label={settings['formatting.sparql.separateClauses']?.title ?? ''}
							description={settings['formatting.sparql.separateClauses']?.description ?? ''}
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
					</>
				)}
			</div>
		</div>
	);
}
