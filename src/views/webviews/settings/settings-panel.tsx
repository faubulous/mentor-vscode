import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/webview-hooks';
import { SettingsNav, NavSection } from './components/settings-nav';
import { StringListEditor } from './components/string-list-editor';
import { ObjectListEditor } from './components/object-list-editor';
import { SettingsPanelMessages, SettingScope, SettingState, LanguageId, FormattingLanguage } from './settings-panel-messages';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { getConfigurationScopeLabel } from '@src/utilities/config-scope';
import stylesheet from './settings-panel.css';

import '@vscode-elements/elements/dist/vscode-button';
import '@vscode-elements/elements/dist/vscode-icon';
import '@vscode-elements/elements/dist/vscode-textfield';
import '@vscode-elements/elements/dist/vscode-textarea';
import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-single-select';
import '@vscode-elements/elements/dist/vscode-option';
import '@vscode-elements/elements/dist/vscode-label';

// ── Types ──────────────────────────────────────────────────────

type EditorSettings = Record<LanguageId, Record<string, SettingState>>;

type TestResult = { success: boolean; error?: string } | null;

interface PanelState {
	settings: Record<string, SettingState>;
	editorSettings: EditorSettings;
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	activeSection: NavSection;
	formattingLanguage: FormattingLanguage;
	version: string;
	searchTerm: string;
}

const initialEditorSettings: EditorSettings = {
	turtle: {}, sparql: {}, trig: {}, n3: {}, ntriples: {}, nquads: {},
};

const initialState: PanelState = {
	settings: {},
	editorSettings: initialEditorSettings,
	connections: [],
	testResults: {},
	activeSection: 'appearance.display',
	formattingLanguage: 'turtle',
	version: '',
	searchTerm: '',
};

// ── MoreVertMenu ───────────────────────────────────────────────

interface MenuItem {
	label: string;
	onClick: () => void;
}

function MoreVertMenu({ items }: { items: MenuItem[] }) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	if (items.length === 0) return null;

	return (
		<div className="more-vert-container" ref={containerRef}>
			<button className="more-vert-button" onClick={() => setOpen(o => !o)} title="More actions">
				⋮
			</button>
			{open && (
				<div className="more-vert-menu">
					{items.map(item => (
						<button
							key={item.label}
							className="more-vert-item"
							onClick={() => { item.onClick(); setOpen(false); }}
						>
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ── SectionHeader ──────────────────────────────────────────────

interface SectionHeaderProps {
	title: React.ReactNode;
	keys?: string[];
	settings?: Record<string, SettingState>;
	onBulkScope?: (keys: string[], scope: 'user' | 'workspace') => void;
}

function SectionHeader({ title, keys, settings, onBulkScope }: SectionHeaderProps) {
	const nonDefault = keys && settings
		? keys.filter(k => settings[k]?.source !== 'default')
		: [];

	const menuItems: MenuItem[] = nonDefault.length > 0 && onBulkScope
		? [
			{ label: 'Copy all to User', onClick: () => onBulkScope(nonDefault, 'user') },
			{ label: 'Copy all to Workspace', onClick: () => onBulkScope(nonDefault, 'workspace') },
		]
		: [];

	return (
		<div className="section-header">
			<h2 className="settings-section-title">{title}</h2>
			<MoreVertMenu items={menuItems} />
		</div>
	);
}

// ── ScopeSelector ──────────────────────────────────────────────

interface ScopeSelectorProps {
	source: SettingScope;
	onChange: (scope: SettingScope) => void;
}

function ScopeSelector({ source, onChange }: ScopeSelectorProps) {
	const displayValue = source === 'default' ? 'user' : source;
	const title = source === 'default'
		? 'Using default value — select to save'
		: source === 'user'
			? 'Stored in User settings'
			: 'Stored in Workspace settings';

	return (
		<select
			className={`scope-selector source-${source}`}
			value={displayValue}
			onChange={e => onChange(e.target.value as SettingScope)}
			title={title}
		>
			<option value="user">User</option>
			<option value="workspace">Workspace</option>
		</select>
	);
}

// ── SettingRow ─────────────────────────────────────────────────

interface SettingRowProps {
	label: React.ReactNode;
	description?: string;
	settingKey: string;
	settings: Record<string, SettingState>;
	onScopeChange: (key: string, newScope: SettingScope, currentValue: unknown) => void;
	children: React.ReactNode;
}

function SettingRow({ label, description, settingKey, settings, onScopeChange, children }: SettingRowProps) {
	const state = settings[settingKey];
	const source = state?.source ?? 'default';

	return (
		<div className="setting-row">
			<div className="setting-row-header">
				<span className="setting-label">{label}</span>
				<span className="setting-leader" aria-hidden="true" />
				<ScopeSelector
					source={source}
					onChange={scope => onScopeChange(settingKey, scope, state?.value)}
				/>
			</div>
			{description && <p className="setting-description">{description}</p>}
			<div className="setting-control">{children}</div>
		</div>
	);
}

// ── EditorSettingRow ───────────────────────────────────────────

interface EditorSettingRowProps {
	label: React.ReactNode;
	description?: string;
	settingKey: string;
	languageId: LanguageId;
	editorSettings: EditorSettings;
	onScopeChange: (languageId: LanguageId, key: string, newScope: SettingScope, currentValue: unknown) => void;
	children: React.ReactNode;
}

function EditorSettingRow({ label, description, settingKey, languageId, editorSettings, onScopeChange, children }: EditorSettingRowProps) {
	const state = editorSettings[languageId]?.[settingKey];
	const source = state?.source ?? 'default';

	return (
		<div className="setting-row">
			<div className="setting-row-header">
				<span className="setting-label">{label}</span>
				<span className="setting-leader" aria-hidden="true" />
				<ScopeSelector
					source={source}
					onChange={scope => onScopeChange(languageId, settingKey, scope, state?.value)}
				/>
			</div>
			{description && <p className="setting-description">{description}</p>}
			<div className="setting-control">{children}</div>
		</div>
	);
}

// ── Section: Appearance > Display ─────────────────────────────

interface DisplaySectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function DisplaySection({ settings, onUpdate, onScopeChange, onBulkScope }: DisplaySectionProps) {
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

// ── Section: Appearance > Definitions Tree ─────────────────────

interface DefinitionsTreeSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function DefinitionsTreeSection({ settings, onUpdate, onScopeChange, onBulkScope }: DefinitionsTreeSectionProps) {
	const keys = [
		'definitionTree.labelStyle',
		'definitionTree.defaultLayout',
		'definitionTree.defaultLanguageTag',
		'definitionTree.decorateMissingLanguageTags',
	];

	return (
		<div>
			<SectionHeader title="Definitions Tree" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Label style"
				description="Controls how labels are displayed in the definitions tree."
				settingKey="definitionTree.labelStyle"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['definitionTree.labelStyle']?.value ?? 'AnnotatedLabels')}
					onChange={(e: any) => onUpdate('definitionTree.labelStyle', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="AnnotatedLabels">Annotated labels</vscode-option>
					<vscode-option value="UriLabels">URI labels</vscode-option>
					<vscode-option value="UriLabelsWithPrefix">URI labels with prefix</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label="Default layout"
				description="How to group resources in the definitions tree."
				settingKey="definitionTree.defaultLayout"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['definitionTree.defaultLayout']?.value ?? 'GroupByType')}
					onChange={(e: any) => onUpdate('definitionTree.defaultLayout', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="GroupByType">Group by type</vscode-option>
					<vscode-option value="GroupBySource">Group by source</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label="Default language tag"
				description="Filter labels and descriptions by this language tag (e.g. 'en', 'de')."
				settingKey="definitionTree.defaultLanguageTag"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['definitionTree.defaultLanguageTag']?.value ?? '')}
					placeholder="en"
					onInput={(e: any) => onUpdate('definitionTree.defaultLanguageTag', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label="Decorate missing language tags"
				description="Highlight resources that are missing a label or description in the default language."
				settingKey="definitionTree.decorateMissingLanguageTags"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['definitionTree.decorateMissingLanguageTags']?.value ?? 'Disabled')}
					onChange={(e: any) => onUpdate('definitionTree.decorateMissingLanguageTags', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="Disabled">Disabled</vscode-option>
					<vscode-option value="All">All</vscode-option>
					<vscode-option value="Document">Document only</vscode-option>
				</vscode-single-select>
			</SettingRow>
		</div>
	);
}

// ── Section: Editor > General ─────────────────────────────────

interface EditorGeneralSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function EditorGeneralSection({ settings, onUpdate, onScopeChange, onBulkScope }: EditorGeneralSectionProps) {
	const keys = [
		'editor.codeLensEnabled',
		'prefixes.autoDefinePrefixes',
		'prefixes.prefixDefinitionMode',
		'prefixes.queryParameterName',
	];

	return (
		<div>
			<SectionHeader title="Editor" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Enable code lens"
				description="Show code lens actions above class definitions and property declarations."
				settingKey="editor.codeLensEnabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['editor.codeLensEnabled']?.value === true}
					onChange={(e: any) => onUpdate('editor.codeLensEnabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label="Auto-define prefixes"
				description="Automatically declare namespace prefixes in the document header when a URI is used."
				settingKey="prefixes.autoDefinePrefixes"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['prefixes.autoDefinePrefixes']?.value === true}
					onChange={(e: any) => onUpdate('prefixes.autoDefinePrefixes', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label="Prefix definition mode"
				description="Controls where new prefix declarations are inserted in the document."
				settingKey="prefixes.prefixDefinitionMode"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['prefixes.prefixDefinitionMode']?.value ?? 'Append')}
					onChange={(e: any) => onUpdate('prefixes.prefixDefinitionMode', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="Append">Append</vscode-option>
					<vscode-option value="Sorted">Sorted</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label="Workspace URI query parameter"
				description="Name of the query parameter appended to workspace: URIs to identify the workspace."
				settingKey="prefixes.queryParameterName"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['prefixes.queryParameterName']?.value ?? '')}
					placeholder="workspace"
					onInput={(e: any) => onUpdate('prefixes.queryParameterName', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
		</div>
	);
}

// ── Section: Editor > Formatting ──────────────────────────────

interface FormattingSectionProps {
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

function FormattingSection({
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

// ── Section: Editor > Sorting ─────────────────────────────────

interface SortingSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function SortingSection({ settings, onUpdate, onScopeChange, onBulkScope }: SortingSectionProps) {
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

// ── Section: Editor > Templates ───────────────────────────────

interface TemplatesSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function TemplatesSection({ settings, onUpdate, onScopeChange, onBulkScope }: TemplatesSectionProps) {
	const languageTemplateKeys: { key: string; label: string }[] = [
		{ key: 'language.sparql.defaultDocumentTemplate', label: 'SPARQL' },
		{ key: 'language.sparql.documentQueryTemplate', label: 'SPARQL query (from document)' },
		{ key: 'language.turtle.defaultDocumentTemplate', label: 'Turtle' },
		{ key: 'language.trig.defaultDocumentTemplate', label: 'TriG' },
		{ key: 'language.n3.defaultDocumentTemplate', label: 'N3' },
		{ key: 'language.ntriples.defaultDocumentTemplate', label: 'N-Triples' },
		{ key: 'language.nquads.defaultDocumentTemplate', label: 'N-Quads' },
	];

	return (
		<div>
			<SectionHeader title="Templates" keys={languageTemplateKeys.map(t => t.key)} settings={settings} onBulkScope={onBulkScope} />
			{languageTemplateKeys.map(({ key, label }) => (
				<SettingRow
					key={key}
					label={`${label} document template`}
					description={`Default content for new ${label} documents.`}
					settingKey={key}
					settings={settings}
					onScopeChange={onScopeChange}
				>
					<vscode-textarea
						className="editor-font-textarea"
						value={String(settings[key]?.value ?? '')}
						rows={4}
						onInput={(e: any) => onUpdate(key, (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
			))}
		</div>
	);
}

// ── Section: Indexing ─────────────────────────────────────────

interface IndexingSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function IndexingSection({ settings, onUpdate, onScopeChange, onBulkScope }: IndexingSectionProps) {
	const keys = ['index.maxFileSize', 'index.useGitIgnore', 'index.ignoreFolders', 'index.includeFiles'];

	return (
		<div>
			<SectionHeader title="Indexing" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Max file size"
				description="Maximum file size in bytes to index. Larger files are skipped."
				settingKey="index.maxFileSize"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['index.maxFileSize']?.value ?? 1048576)}
					type="number"
					onInput={(e: any) => onUpdate('index.maxFileSize', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow
				label="Use .gitignore"
				description="Exclude files and folders matched by .gitignore patterns from the workspace index."
				settingKey="index.useGitIgnore"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['index.useGitIgnore']?.value === true}
					onChange={(e: any) => onUpdate('index.useGitIgnore', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label="Ignore folders"
				description="Glob patterns for folders to exclude from the workspace index."
				settingKey="index.ignoreFolders"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['index.ignoreFolders']?.value as string[]) ?? []}
					placeholder="**/node_modules"
					onChange={v => onUpdate('index.ignoreFolders', v)}
				/>
			</SettingRow>
			<SettingRow
				label="Include files"
				description="Glob patterns for files to force-include in the workspace index regardless of other exclusion rules."
				settingKey="index.includeFiles"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['index.includeFiles']?.value as string[]) ?? []}
					placeholder="**/*.ttl"
					onChange={v => onUpdate('index.includeFiles', v)}
				/>
			</SettingRow>
		</div>
	);
}

// ── Section: Connections ───────────────────────────────────────

interface ConnectionsSectionProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	onCreateConnection: () => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection) => void;
	onListGraphs: (connection: SparqlConnection) => void;
	onOpenInBrowser: (url: string) => void;
}

function ConnectionsSection({
	connections,
	testResults,
	onCreateConnection,
	onEditConnection,
	onDeleteConnection,
	onTestConnection,
	onListGraphs,
	onOpenInBrowser,
}: ConnectionsSectionProps) {
	const grouped: Record<string, SparqlConnection[]> = {};
	for (const conn of connections) {
		const label = getConfigurationScopeLabel(conn.configScope);
		if (!grouped[label]) grouped[label] = [];
		grouped[label].push(conn);
	}

	return (
		<div>
			<div className="section-header">
				<h2 className="settings-section-title">Connections</h2>
			</div>
			<div style={{ marginBottom: '16px' }}>
				<vscode-button onClick={onCreateConnection}>
					<vscode-icon slot="start" name="add" />
					New Connection
				</vscode-button>
			</div>
			{connections.length === 0 && (
				<p className="setting-description">No connections configured. Click "New Connection" to add one.</p>
			)}
			{Object.entries(grouped).map(([scopeLabel, conns]) => (
				<div key={scopeLabel} className="settings-subsection">
					<div className="settings-subsection-title">{scopeLabel}</div>
					<div className="connections-list">
						{conns.map(conn => {
							const result = testResults[conn.id];
							const isTesting = result === null;
							const testClass = isTesting
								? 'test-testing'
								: result?.success === true
									? 'test-success'
									: result?.success === false
										? 'test-error'
										: '';
							const iconName = isTesting
								? 'ellipsis'
								: result?.success === true
									? 'pass-filled'
									: result?.success === false
										? 'error'
										: 'database';

							return (
								<div
									key={conn.id}
									className={`connection-item${conn.isProtected ? ' protected' : ''}${testClass ? ` ${testClass}` : ''}`}
									onClick={() => !conn.isProtected && onEditConnection(conn)}
									title={conn.endpointUrl}
								>
									<div className={isTesting ? 'connection-icon-testing' : ''}>
										<vscode-icon name={iconName} />
									</div>
									<div className="connection-item-info">
										<div className="connection-item-url">
											{conn.isProtected && (
												<i className="codicon codicon-lock" style={{ fontSize: '11px', opacity: 0.6 }} />
											)}
											{conn.endpointUrl}
										</div>
										{result?.error ? (
											<div className="connection-item-error">{result.error}</div>
										) : conn.description ? (
											<div className="connection-item-meta">{conn.description}</div>
										) : null}
									</div>
									<div className="connection-item-actions" onClick={e => e.stopPropagation()}>
										{conn.endpointUrl && (
											<vscode-button {...({ appearance: 'icon' } as {})} title="Open in browser" onClick={() => onOpenInBrowser(conn.endpointUrl)}>
												<vscode-icon name="globe" />
											</vscode-button>
										)}
										{!conn.isProtected && (
											<>
												<vscode-button {...({ appearance: 'icon' } as {})} title="List graphs" onClick={() => onListGraphs(conn)}>
													<vscode-icon name="list-flat" />
												</vscode-button>
												<vscode-button {...({ appearance: 'icon' } as {})} title="Test connection" onClick={() => onTestConnection(conn)}>
													<vscode-icon name="debug-start" />
												</vscode-button>
												<vscode-button {...({ appearance: 'icon' } as {})} title="Delete" onClick={() => onDeleteConnection(conn)}>
													<vscode-icon name="trash" />
												</vscode-button>
											</>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}

// ── Section: Query ────────────────────────────────────────────

interface QuerySectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function QuerySection({ settings, onUpdate, onScopeChange, onBulkScope }: QuerySectionProps) {
	const keys = [
		'sparql.defaultInferenceEnabled',
		'sparql.queryTimeout',
		'sparql.listGraphsQuery',
		'sparql.dropGraphQuery',
		'sparql.describeQueryTemplate',
	];

	return (
		<div>
			<SectionHeader title="Query" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Default inference enabled"
				description="Enable inference by default for new SPARQL connections."
				settingKey="sparql.defaultInferenceEnabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['sparql.defaultInferenceEnabled']?.value === true}
					onChange={(e: any) => onUpdate('sparql.defaultInferenceEnabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label="Query timeout"
				description="Timeout in milliseconds for SPARQL query execution. Set to 0 to disable."
				settingKey="sparql.queryTimeout"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['sparql.queryTimeout']?.value ?? 30000)}
					type="number"
					onInput={(e: any) => onUpdate('sparql.queryTimeout', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow
				label="List graphs query"
				description="SPARQL query template used to list named graphs in a SPARQL endpoint."
				settingKey="sparql.listGraphsQuery"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className="editor-font-textarea"
					value={String(settings['sparql.listGraphsQuery']?.value ?? '')}
					rows={4}
					onInput={(e: any) => onUpdate('sparql.listGraphsQuery', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label="Drop graph query"
				description="SPARQL query template used to drop a named graph from a SPARQL endpoint."
				settingKey="sparql.dropGraphQuery"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className="editor-font-textarea"
					value={String(settings['sparql.dropGraphQuery']?.value ?? '')}
					rows={4}
					onInput={(e: any) => onUpdate('sparql.dropGraphQuery', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label="Describe query template"
				description="SPARQL DESCRIBE query template. Use {{uri}} as the placeholder for the resource URI."
				settingKey="sparql.describeQueryTemplate"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className="editor-font-textarea"
					value={String(settings['sparql.describeQueryTemplate']?.value ?? '')}
					rows={4}
					onInput={(e: any) => onUpdate('sparql.describeQueryTemplate', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
		</div>
	);
}

// ── Section: Namespaces ───────────────────────────────────────

interface NamespacesSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function NamespacesSection({ settings, onUpdate, onScopeChange, onBulkScope }: NamespacesSectionProps) {
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

// ── Section: Validation ───────────────────────────────────────

interface ShaclGraphEntry {
	includeDefaults: boolean;
	includeShapes: string[];
	excludeShapes: string[];
}

interface ValidationSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function ValidationSection({ settings, onUpdate, onScopeChange, onBulkScope }: ValidationSectionProps) {
	const [expandedGraphs, setExpandedGraphs] = useState<Set<string>>(new Set());
	const validation = (settings['shacl.validation']?.value ?? { defaults: [], graphs: {} }) as {
		defaults: string[];
		graphs: Record<string, ShaclGraphEntry>;
	};

	const updateValidation = (patch: Partial<typeof validation>) => {
		onUpdate('shacl.validation', { ...validation, ...patch });
	};

	const updateGraph = (uri: string, patch: Partial<ShaclGraphEntry>) => {
		updateValidation({
			graphs: {
				...validation.graphs,
				[uri]: { ...validation.graphs[uri], ...patch },
			},
		});
	};

	const removeGraph = (uri: string) => {
		const { [uri]: _, ...rest } = validation.graphs;
		updateValidation({ graphs: rest });
	};

	const addGraph = () => {
		const uri = 'workspace://';
		if (!validation.graphs[uri]) {
			updateValidation({
				graphs: {
					...validation.graphs,
					[uri]: { includeDefaults: true, includeShapes: [], excludeShapes: [] },
				},
			});
		}
	};

	const toggleGraph = (uri: string) => {
		setExpandedGraphs(prev => {
			const next = new Set(prev);
			next.has(uri) ? next.delete(uri) : next.add(uri);
			return next;
		});
	};

	return (
		<div>
			<SectionHeader
				title={<>Validation <span className="badge-experimental">Experimental</span></>}
				keys={['shacl.enabled', 'shacl.validation']}
				settings={settings}
				onBulkScope={onBulkScope}
			/>
			<SettingRow
				label="Enable SHACL validation"
				description="Validate RDF documents against SHACL shapes. This feature is experimental."
				settingKey="shacl.enabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['shacl.enabled']?.value === true}
					onChange={(e: any) => onUpdate('shacl.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>

			<div className="settings-subsection">
				<div className="settings-group-title">Default shapes</div>
				<p className="setting-description">Shape graph URIs applied by default to all graphs that do not have per-graph settings.</p>
				<StringListEditor
					items={validation.defaults}
					placeholder="workspace://..."
					onChange={v => updateValidation({ defaults: v })}
				/>
			</div>

			<div className="settings-subsection">
				<div className="settings-group-title">Per-graph configuration</div>
				{Object.entries(validation.graphs).map(([uri, entry]) => (
					<div key={uri} className="shacl-graph-entry">
						<div className="shacl-graph-header" onClick={() => toggleGraph(uri)}>
							<i className={`codicon codicon-chevron-${expandedGraphs.has(uri) ? 'down' : 'right'}`} />
							<span className="shacl-graph-uri">{uri}</span>
							<vscode-button {...({ appearance: 'icon' } as {})} title="Remove" onClick={(e: any) => { e.stopPropagation(); removeGraph(uri); }}>
								<vscode-icon name="close" />
							</vscode-button>
						</div>
						{expandedGraphs.has(uri) && (
							<div className="shacl-graph-body">
								<div className="setting-row" style={{ borderBottom: 'none', paddingTop: 0 }}>
									<vscode-checkbox
										checked={entry.includeDefaults !== false}
										onChange={(e: any) => updateGraph(uri, { includeDefaults: (e.target as HTMLInputElement).checked })}
									>
										Include default shapes
									</vscode-checkbox>
								</div>
								<div>
									<p className="setting-description" style={{ marginBottom: '6px' }}>Include shapes</p>
									<StringListEditor
										items={entry.includeShapes ?? []}
										placeholder="workspace://..."
										onChange={v => updateGraph(uri, { includeShapes: v })}
									/>
								</div>
								<div>
									<p className="setting-description" style={{ marginBottom: '6px' }}>Exclude shapes</p>
									<StringListEditor
										items={entry.excludeShapes ?? []}
										placeholder="workspace://..."
										onChange={v => updateGraph(uri, { excludeShapes: v })}
									/>
								</div>
							</div>
						)}
					</div>
				))}
				<div style={{ marginTop: '8px' }}>
					<vscode-button {...({ appearance: 'secondary' } as {})} onClick={addGraph}>
						<vscode-icon slot="start" name="add" />
						Add graph configuration
					</vscode-button>
				</div>
			</div>
		</div>
	);
}

// ── Section: Inference ────────────────────────────────────────

interface InferenceSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

function InferenceSection({ settings, onUpdate, onScopeChange, onBulkScope }: InferenceSectionProps) {
	return (
		<div>
			<SectionHeader
				title={<>Inference <span className="badge-experimental">Experimental</span></>}
				keys={['inference.enabled']}
				settings={settings}
				onBulkScope={onBulkScope}
			/>
			<SettingRow
				label="Enable inference toggle"
				description="Show the inference toggle button in the SPARQL connection view. This feature is experimental."
				settingKey="inference.enabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['inference.enabled']?.value === true}
					onChange={(e: any) => onUpdate('inference.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
		</div>
	);
}

// ── MentorIcon ────────────────────────────────────────────────

function MentorIcon() {
	const url = document.getElementById('root')?.dataset.mentorIconUrl;
	return (
		<img
			src={url}
			width={32}
			height={32}
			aria-hidden="true"
			style={{ flexShrink: 0 }}
		/>
	);
}

// ── PanelHeader ───────────────────────────────────────────────

interface PanelHeaderProps {
	version: string;
	searchTerm: string;
	onSearchChange: (term: string) => void;
}

function PanelHeader({ version, searchTerm, onSearchChange }: PanelHeaderProps) {
	return (
		<div className="panel-header">
			<MentorIcon />
			<div className="panel-header-brand">
				<span className="panel-header-title">Mentor</span>
				{version && <span className="panel-header-version">v{version}</span>}
			</div>
			<div className="panel-header-search">
				<vscode-textfield
					placeholder="Search settings…"
					value={searchTerm}
					onInput={(e: React.FormEvent<HTMLElement>) => onSearchChange((e.target as HTMLInputElement).value)}
				>
					<vscode-icon
						slot="content-before"
						name="search"
						title="search"
					></vscode-icon>
				</vscode-textfield>
			</div>
		</div>
	);
}

// ── SearchResults ─────────────────────────────────────────────

interface CatalogEntry {
	section: NavSection;
	sectionLabel: string;
	label: string;
	description: string;
}

const SETTINGS_CATALOG: CatalogEntry[] = [
	{ section: 'appearance.display', sectionLabel: 'Display', label: 'Label predicates', description: 'RDF predicate URIs used to display labels for resources.' },
	{ section: 'appearance.display', sectionLabel: 'Display', label: 'Description predicates', description: 'RDF predicate URIs used to display descriptions for resources.' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Label style', description: 'How labels are displayed in the definitions tree.' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Default layout', description: 'How to group resources in the definitions tree.' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Default language tag', description: 'Filter labels and descriptions by language tag (e.g. en, de).' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Decorate missing language tags', description: 'Highlight resources missing a label in the default language.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Enable code lens', description: 'Show code lens actions above class definitions and property declarations.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Auto-define prefixes', description: 'Automatically declare namespace prefixes in the document header.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Prefix definition mode', description: 'Controls where new prefix declarations are inserted in the document.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Workspace URI query parameter', description: 'Name of the query parameter appended to workspace: URIs.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Format on save', description: 'Automatically format documents on save.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Tab size', description: 'Number of spaces per indent level used by the Mentor formatter.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Insert spaces', description: 'Use spaces instead of tabs for indentation.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Word wrap', description: 'Controls how lines wrap in the editor.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Max line width', description: 'Maximum line width before the formatter wraps long lines.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Space before punctuation', description: 'Insert a space before punctuation characters.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Blank lines between subjects', description: 'Insert a blank line between each top-level subject block (Turtle).' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Uppercase keywords', description: 'Format SPARQL keywords (SELECT, WHERE, etc.) in uppercase.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Align patterns', description: 'Align triple patterns in the WHERE clause (SPARQL).' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Opening brace on same line', description: 'Place opening braces on the same line as SPARQL keywords.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Separate clauses', description: 'Insert blank lines between major SPARQL clauses.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Type order', description: 'RDF type IRIs in priority order for sorting documents by type.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Predicate order', description: 'Predicate IRIs for secondary sorting within each type group.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Unmatched resource position', description: 'Where to place resources not matching any type in the order list.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Unmatched resource sort', description: 'How to sort resources not matching any type in the order list.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'SPARQL document template', description: 'Default content for new SPARQL documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'SPARQL query (from document) template', description: 'Template used when opening a query from a document.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'Turtle document template', description: 'Default content for new Turtle documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'TriG document template', description: 'Default content for new TriG documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'N3 document template', description: 'Default content for new N3 documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'N-Triples document template', description: 'Default content for new N-Triples documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'N-Quads document template', description: 'Default content for new N-Quads documents.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Max file size', description: 'Maximum file size in bytes to index. Larger files are skipped.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Use .gitignore', description: 'Exclude files matched by .gitignore patterns from the workspace index.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Ignore folders', description: 'Glob patterns for folders to exclude from the workspace index.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Include files', description: 'Glob patterns for files to force-include in the workspace index.' },
	{ section: 'connections', sectionLabel: 'Connections', label: 'SPARQL connections', description: 'Manage SPARQL endpoint connections for querying.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Default inference enabled', description: 'Enable inference by default for new SPARQL connections.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Query timeout', description: 'Timeout in milliseconds for SPARQL query execution.' },
	{ section: 'query', sectionLabel: 'Query', label: 'List graphs query', description: 'SPARQL query template used to list named graphs in an endpoint.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Drop graph query', description: 'SPARQL query template used to drop a named graph from an endpoint.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Describe query template', description: 'SPARQL DESCRIBE query template. Use {{uri}} as the resource placeholder.' },
	{ section: 'namespaces', sectionLabel: 'Namespaces', label: 'Namespace prefixes', description: 'Custom namespace URI and prefix pairs for completion and auto-definition.' },
	{ section: 'validation', sectionLabel: 'Validation', label: 'Enable SHACL validation', description: 'Validate RDF documents against SHACL shapes (experimental).' },
	{ section: 'validation', sectionLabel: 'Validation', label: 'Default shapes', description: 'Shape graph URIs applied by default to all graphs without per-graph settings.' },
	{ section: 'validation', sectionLabel: 'Validation', label: 'Per-graph configuration', description: 'SHACL shape configurations for specific named graphs.' },
	{ section: 'inference', sectionLabel: 'Inference', label: 'Enable inference toggle', description: 'Show the inference toggle button in the SPARQL connection view (experimental).' },
];

interface SearchResultsProps {
	searchTerm: string;
	onNavigate: (section: NavSection) => void;
}

function SearchResults({ searchTerm, onNavigate }: SearchResultsProps) {
	const term = searchTerm.toLowerCase();
	const results = SETTINGS_CATALOG.filter(entry =>
		entry.label.toLowerCase().includes(term) ||
		entry.description.toLowerCase().includes(term) ||
		entry.sectionLabel.toLowerCase().includes(term)
	);

	if (results.length === 0) {
		return <div className="search-empty">No settings found for "{searchTerm}".</div>;
	}

	return (
		<div className="search-results">
			{results.map((entry, i) => (
				<div
					key={i}
					className="search-result-item"
					onClick={() => onNavigate(entry.section)}
				>
					<div className="search-result-breadcrumb">{entry.sectionLabel}</div>
					<div className="search-result-label">{entry.label}</div>
					<div className="search-result-description">{entry.description}</div>
				</div>
			))}
		</div>
	);
}

// ── Root: SettingsPanel ────────────────────────────────────────

function SettingsPanel() {
	const [state, setState] = useWebviewState<PanelState>(initialState);

	const handleMessage = useCallback((message: SettingsPanelMessages) => {
		switch (message.id) {
			case 'GetSettingsResult':
			case 'OnSettingsChanged':
				setState(prev => ({ ...prev, settings: message.settings }));
				return;
			case 'GetEditorSettingsResult':
			case 'OnEditorSettingsChanged':
				setState(prev => ({
					...prev,
					editorSettings: { ...prev.editorSettings, [message.languageId]: message.settings },
				}));
				return;
			case 'GetConnectionsResult':
			case 'ConnectionsChanged':
				setState(prev => ({ ...prev, connections: message.connections }));
				return;
			case 'TestConnectionResult':
				setState(prev => ({
					...prev,
					testResults: {
						...prev.testResults,
						[message.connectionId]: message.success
							? { success: true }
							: { success: false, error: message.error },
					},
				}));
				return;
			case 'GetVersionResult':
				setState(prev => ({ ...prev, version: message.version }));
				return;
		}
	}, [setState]);

	const messaging = useWebviewMessaging<SettingsPanelMessages>(handleMessage);

	useStylesheet('settings-panel-styles', stylesheet);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetSettings' });
		messaging?.postMessage({ id: 'GetConnections' });
		messaging?.postMessage({ id: 'GetEditorSettings', languageId: 'turtle' });
		messaging?.postMessage({ id: 'GetEditorSettings', languageId: 'sparql' });
		messaging?.postMessage({ id: 'GetVersion' });
	}, []);

	const handleUpdate = useCallback((key: string, value: unknown) => {
		const currentSource = state.settings[key]?.source ?? 'default';
		const scope: SettingScope = currentSource === 'default' ? 'user' : currentSource;

		setState(prev => ({
			...prev,
			settings: {
				...prev.settings,
				[key]: { ...prev.settings[key], value, source: scope },
			},
		}));

		messaging?.postMessage({ id: 'UpdateSetting', key, value, scope });
	}, [state.settings, messaging, setState]);

	const handleScopeChange = useCallback((key: string, newScope: SettingScope, currentValue: unknown) => {
		setState(prev => ({
			...prev,
			settings: {
				...prev.settings,
				[key]: { ...prev.settings[key], source: newScope },
			},
		}));

		messaging?.postMessage({ id: 'UpdateSetting', key, value: newScope === 'default' ? undefined : currentValue, scope: newScope });
	}, [messaging, setState]);

	const handleEditorUpdate = useCallback((languageId: LanguageId, key: string, value: unknown) => {
		const currentSource = state.editorSettings[languageId]?.[key]?.source ?? 'default';
		const scope: SettingScope = currentSource === 'default' ? 'user' : currentSource;

		setState(prev => ({
			...prev,
			editorSettings: {
				...prev.editorSettings,
				[languageId]: {
					...prev.editorSettings[languageId],
					[key]: { ...prev.editorSettings[languageId]?.[key], value, source: scope },
				},
			},
		}));

		messaging?.postMessage({ id: 'UpdateEditorSetting', languageId, key, value, scope });
	}, [state.editorSettings, messaging, setState]);

	const handleEditorScopeChange = useCallback((languageId: LanguageId, key: string, newScope: SettingScope, currentValue: unknown) => {
		setState(prev => ({
			...prev,
			editorSettings: {
				...prev.editorSettings,
				[languageId]: {
					...prev.editorSettings[languageId],
					[key]: { ...prev.editorSettings[languageId]?.[key], source: newScope },
				},
			},
		}));

		messaging?.postMessage({ id: 'UpdateEditorSetting', languageId, key, value: newScope === 'default' ? undefined : currentValue, scope: newScope });
	}, [messaging, setState]);

	const handleBulkScope = useCallback((keys: string[], scope: 'user' | 'workspace') => {
		for (const key of keys) {
			const value = state.settings[key]?.value;
			handleScopeChange(key, scope, value);
		}
	}, [state.settings, handleScopeChange]);

	const handleNavSelect = useCallback((section: NavSection) => {
		setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }));

		if (section === 'editor.formatting') {
			const lang = state.formattingLanguage;
			messaging?.postMessage({ id: 'GetEditorSettings', languageId: lang });
		}
	}, [state.formattingLanguage, messaging, setState]);

	const handleFormattingLanguageChange = useCallback((lang: FormattingLanguage) => {
		setState(prev => ({ ...prev, formattingLanguage: lang }));
		messaging?.postMessage({ id: 'GetEditorSettings', languageId: lang });
	}, [messaging, setState]);

	const handleSearchChange = useCallback((term: string) => {
		setState(prev => ({ ...prev, searchTerm: term }));
	}, [setState]);

	const commonProps = { settings: state.settings, onUpdate: handleUpdate, onScopeChange: handleScopeChange, onBulkScope: handleBulkScope };

	const renderSection = () => {
		if (state.searchTerm.trim()) {
			return (
				<SearchResults
					searchTerm={state.searchTerm}
					onNavigate={section => setState(prev => ({ ...prev, activeSection: section, searchTerm: '' }))}
				/>
			);
		}

		switch (state.activeSection) {
			case 'appearance.display':
				return <DisplaySection {...commonProps} />;
			case 'appearance.definitions-tree':
				return <DefinitionsTreeSection {...commonProps} />;
			case 'editor.general':
				return <EditorGeneralSection {...commonProps} />;
			case 'editor.formatting':
				return (
					<FormattingSection
						{...commonProps}
						editorSettings={state.editorSettings}
						formattingLanguage={state.formattingLanguage}
						onFormattingLanguageChange={handleFormattingLanguageChange}
						onEditorUpdate={handleEditorUpdate}
						onEditorScopeChange={handleEditorScopeChange}
					/>
				);
			case 'editor.sorting':
				return <SortingSection {...commonProps} />;
			case 'editor.templates':
				return <TemplatesSection {...commonProps} />;
			case 'indexing':
				return <IndexingSection {...commonProps} />;
			case 'connections':
				return (
					<ConnectionsSection
						connections={state.connections}
						testResults={state.testResults}
						onCreateConnection={() => messaging?.postMessage({ id: 'CreateConnection' })}
						onEditConnection={conn => messaging?.postMessage({ id: 'EditConnection', connection: conn })}
						onDeleteConnection={conn => messaging?.postMessage({ id: 'DeleteConnection', connection: conn })}
						onTestConnection={conn => {
							setState(prev => ({ ...prev, testResults: { ...prev.testResults, [conn.id]: null } }));
							messaging?.postMessage({ id: 'TestConnection', connection: conn });
						}}
						onListGraphs={conn => {
							setState(prev => ({ ...prev, testResults: { ...prev.testResults, [conn.id]: null } }));
							messaging?.postMessage({ id: 'ListGraphs', connection: conn });
						}}
						onOpenInBrowser={url => messaging?.postMessage({ id: 'OpenInBrowser', url })}
					/>
				);
			case 'query':
				return <QuerySection {...commonProps} />;
			case 'namespaces':
				return <NamespacesSection {...commonProps} />;
			case 'validation':
				return <ValidationSection {...commonProps} />;
			case 'inference':
				return <InferenceSection {...commonProps} />;
			default:
				return null;
		}
	};

	return (
		<div className="settings-panel">
			<PanelHeader
				version={state.version}
				searchTerm={state.searchTerm}
				onSearchChange={handleSearchChange}
			/>
			<div className="settings-body">
				<SettingsNav activeSection={state.activeSection} onSelect={handleNavSelect} />
				<div className="settings-content">
					{renderSection()}
				</div>
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsPanel />);
