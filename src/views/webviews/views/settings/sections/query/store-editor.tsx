import * as React from 'react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { ModalDialogHeaderActionsContext, ModalDialogTitleAccessoriesContext } from '@src/views/webviews/components/modal-dialog';
import { ScopeSelect } from '@src/views/webviews/components/scope-select';
import { TemplatePreview } from '@src/views/webviews/components/template-preview';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { useScopedWebviewMessaging, useStylesheet, useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import {
	SparqlStoreConfig,
	SparqlStoreInferenceConfig,
	SparqlQueryKind,
} from '@src/languages/sparql/services/sparql-store-config';
import { SettingState } from '../../settings-types';
import modalFormStylesheet from '@src/views/webviews/components/modal-form.css';
import stylesheet from './store-editor.css';

/** Builds the scratch token identifying an open per-store query-template editor. */
const templateToken = (storeId: string, kind: SparqlQueryKind) => `${kind}~${storeId}`;


export interface StoreEditorProps {
	/**
	 * The store being edited. For a new store this is a blank profile not yet in settings.
	 */
	store: SparqlStoreConfig;

	/**
	 * Whether this is a brand-new (unsaved) store — hides the Delete action.
	 */
	isNew: boolean;

	/**
	 * When true, the store is a built-in store: all fields are disabled and Save/Delete are hidden.
	 */
	readOnly?: boolean;

	/**
	 * Whether a workspace folder is open; disables the Workspace scope option when false.
	 */
	hasWorkspace?: boolean;

	/**
	 * Section settings map, used to read the global query-template defaults.
	 */
	settings: Record<string, SettingState>;

	onSave: (store: SparqlStoreConfig) => void;

	onDelete: (store: SparqlStoreConfig) => void;

	onDirtyChange: (dirty: boolean) => void;
}

/**
 * The form rendered inside the store edit modal. Holds a local draft of the
 * store and commits it only when Save is clicked; until then nothing is written
 * to settings. Save/Delete portal into the modal header. Styling follows the
 * shared `modal-form` look used by the SPARQL connection editor.
 */
export function StoreEditor({ store, isNew, readOnly, hasWorkspace, settings, onSave, onDelete, onDirtyChange }: StoreEditorProps) {
	useStylesheet('modal-form-styles', modalFormStylesheet);
	useStylesheet('store-editor-styles', stylesheet);

	const headerActionsSlot = useContext(ModalDialogHeaderActionsContext);
	const titleAccessoriesSlot = useContext(ModalDialogTitleAccessoriesContext);

	const [draft, setDraft] = useState<SparqlStoreConfig>(store);
	const [activeTab, setActiveTab] = useState(0);
	const [queryKind, setQueryKind] = useState<string>('');

	// The store-overridable query templates are discovered from the settings payload: every
	// `mentor.*` setting marked with `storeQueryKind` in package.json. package.json is the single
	// source for which queries are editable and for their title/description/default.
	const queryKinds = useMemo(
		() => Object.entries(settings)
			.filter(([, s]) => typeof s.storeQueryKind === 'string')
			.map(([key, s]) => ({ kind: s.storeQueryKind as SparqlQueryKind, key, title: s.title, description: s.description })),
		[settings],
	);

	// The selected kind, clamped to a still-valid entry (defaults to the first discovered query).
	const activeQuery = queryKinds.find(q => q.kind === queryKind) ?? queryKinds[0];

	// Reseed the draft whenever a different store is opened.
	useEffect(() => {
		setDraft(store);
		setActiveTab(0);
		setQueryKind('');
	}, [store]);

	const hasChanges = JSON.stringify(draft) !== JSON.stringify(store);
	const canSave = draft.label.trim().length > 0 && hasChanges;

	useEffect(() => {
		onDirtyChange(hasChanges);
	}, [hasChanges]);

	const updateInference = (patch: Partial<SparqlStoreInferenceConfig>) => {
		setDraft(d => {
			const inference: SparqlStoreInferenceConfig = {
				supported: d.inference?.supported ?? false,
				...d.inference,
				...patch,
			};
			return { ...d, inference };
		});
	};

	// Updates one on/off value of a reasoning channel (urlParameters / queryPragma), pruning empties.
	const updateInferenceToggle = (channel: 'urlParameters' | 'queryPragma', state: 'enabled' | 'disabled', value: string) => {
		setDraft(d => {
			const toggle = { ...d.inference?.[channel] };

			if (value.trim()) {
				toggle[state] = value;
			} else {
				delete toggle[state];
			}

			const inference: SparqlStoreInferenceConfig = {
				supported: d.inference?.supported ?? false,
				...d.inference,
				[channel]: Object.keys(toggle).length > 0 ? toggle : undefined,
			};
			return { ...d, inference };
		});
	};

	// Query-template fields: a value equal to the (global) default — or left blank — clears the
	// per-store override so the store falls back to the global default (matching how the connection
	// service resolves templates at runtime).
	const updateQuery = (kind: SparqlQueryKind, value: string, defaultValue: string) => {
		setDraft(d => {
			const queries = { ...d.queries };

			if (!value.trim() || value === defaultValue) {
				delete queries[kind];
			} else {
				queries[kind] = value;
			}

			return { ...d, queries: Object.keys(queries).length > 0 ? queries : undefined };
		});
	};

	const queryKindRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => setQueryKind(element.value));

	// Fold edits made in an external template editor back into the draft. The save event is
	// relayed by the stores section controller on the shared 'query.stores' channel; we only act
	// on tokens that target the store currently open in this editor.
	const handleSavedTemplate = useCallback((message: { id: string; token?: string; content?: string }) => {
		if (message.id !== 'StoreQueryTemplateSaved' || typeof message.token !== 'string') {
			return;
		}

		const [kind, storeId] = message.token.split('~') as [SparqlQueryKind, string];
		const entry = queryKinds.find(q => q.kind === kind);

		if (storeId !== draft.id || !entry) {
			return;
		}

		const defaultValue = String(settings[entry.key]?.value ?? '');
		updateQuery(kind, message.content ?? '', defaultValue);
	}, [draft.id, settings, queryKinds]);

	useScopedWebviewMessaging<{ id: string; token?: string; content?: string }>('query.stores', handleSavedTemplate);

	const tabsRef = useVscodeElementRef<HTMLElement & { selectedIndex: number }>('vsc-tabs-select', (element) => {
		setActiveTab(element.selectedIndex);
	});

	// Toggle reasoning support from the current draft state rather than reading the checkbox's
	// `checked` property: the controlled vscode-checkbox reports its value unreliably on the first
	// change, which previously meant the new state was only captured on the second toggle.
	const toggleReasoning = () => {
		const enabled = !(draft.inference?.supported ?? false);
		updateInference({ supported: enabled });
	};

	// Reasoning parameter/pragma fields: optional, start empty.
	const renderInferenceField = (label: string, placeholder: string, value: string, onInput: (value: string) => void) => (
		<div className="layout-row reasoning-parameter-row">
			<vscode-label>{label}</vscode-label>
			<vscode-textfield
				value={value}
				placeholder={placeholder}
				disabled={readOnly}
				onInput={(e: any) => onInput((e.target as HTMLInputElement).value)}
			/>
		</div>
	);

	const renderActions = () => (
		<div className={`form-actions ${readOnly ? 'readonly' : ''}`}>
			{readOnly && <vscode-icon name="lock" title="Built-in store" />}
			{!readOnly && (
				<>
					{!isNew && (
						<vscode-toolbar-button title="Delete store" onClick={() => onDelete(draft)}>
							<vscode-icon name="trash" />
						</vscode-toolbar-button>
					)}
					<vscode-button title="Save store" onClick={() => onSave({ ...draft, label: draft.label.trim() })} disabled={!canSave}>
						Save
					</vscode-button>
				</>
			)}
		</div>
	);

	return (
		<div className="modal-form store-editor-content">
			{headerActionsSlot && createPortal(renderActions(), headerActionsSlot)}

			{!readOnly && titleAccessoriesSlot && createPortal(
				<ScopeSelect
					value={draft.configScope === ConfigurationScope.Workspace ? 'workspace' : 'user'}
					onChange={(scope) => setDraft(d => ({ ...d, configScope: scope === 'workspace' ? ConfigurationScope.Workspace : ConfigurationScope.User }))}
					hasWorkspace={hasWorkspace}
				/>,
				titleAccessoriesSlot
			)}

			<vscode-tabs ref={tabsRef} selectedIndex={activeTab}>
				<vscode-tab-header slot="header">General</vscode-tab-header>
				<vscode-tab-panel>
					<section>
						<div>
							<vscode-label>Name</vscode-label>
							<vscode-textfield
								value={draft.label}
								placeholder="Triple Store"
								disabled={readOnly}
								onInput={(e: any) => setDraft(d => ({ ...d, label: (e.target as HTMLInputElement).value }))}
							/>
						</div>
						<div>
							<vscode-label>Website <span className="label-optional">(optional)</span></vscode-label>
							<vscode-textfield
								value={draft.website ?? ''}
								placeholder="https://..."
								disabled={readOnly}
								onInput={(e: any) => setDraft(d => ({ ...d, website: (e.target as HTMLInputElement).value || undefined }))}
							/>
						</div>
						<div className="inference-toggle-container">
							<vscode-label>Reasoning</vscode-label>
							<vscode-checkbox checked={draft.inference?.supported ?? false} disabled={readOnly} onChange={toggleReasoning}>
								Supports reasoning control per query
							</vscode-checkbox>
						</div>
					</section>
				</vscode-tab-panel>

				<vscode-tab-header slot="header">Queries</vscode-tab-header>
				<vscode-tab-panel className="queries-tab-panel">
					{activeQuery && (() => {
						const { kind, key, description } = activeQuery;
						const defaultValue = String(settings[key]?.value ?? '');
						const override = draft.queries?.[kind];
						// A blank/absent override falls back to the global default, mirroring runtime resolution;
						// editing therefore starts from the currently used default.
						const usesDefault = !override?.trim();
						const value = usesDefault ? defaultValue : override!;

						return (
							<section className="queries-section">
								<div className="layout-row queries-header-row">
									<vscode-single-select ref={queryKindRef} value={kind}>
										{queryKinds.map(q => (
											<vscode-option key={q.kind} value={q.kind}>{q.title}</vscode-option>
										))}
									</vscode-single-select>
									<span className="queries-leader" aria-hidden="true" />
								</div>
								<p className="section-description">{description}</p>
								<TemplatePreview
									language="sparql"
									disabled={readOnly}
									muted={usesDefault}
									target={{ kind: 'scratch', token: templateToken(draft.id, kind), content: value }}
									value={value}
								/>
								<vscode-form-helper>Leave blank to use the global default.</vscode-form-helper>
							</section>
						);
					})()}
				</vscode-tab-panel>

				<vscode-tab-header slot="header">Reasoning</vscode-tab-header>
				<vscode-tab-panel>
					{draft.inference?.supported ? (
						<>
							<section>
								<div>
									<span className="section-label">URL Parameters</span>
									<p className="section-description">Query-string fragment appended to the endpoint URL.</p>
								</div>
								<div>
									{renderInferenceField('Enabled', 'infer=true&reasoning=rdfs', draft.inference?.urlParameters?.enabled ?? '', v => updateInferenceToggle('urlParameters', 'enabled', v))}
									{renderInferenceField('Disabled', 'infer=false', draft.inference?.urlParameters?.disabled ?? '', v => updateInferenceToggle('urlParameters', 'disabled', v))}
								</div>
							</section>
							<section>
								<div>
									<span className="section-label">Query Pragma</span>
									<p className="section-description">Text prepended to the query.</p>
								</div>
								<div>
									{renderInferenceField('Enabled', '#pragma reasoning on', draft.inference?.queryPragma?.enabled ?? '', v => updateInferenceToggle('queryPragma', 'enabled', v))}
									{renderInferenceField('Disabled', '#pragma reasoning off', draft.inference?.queryPragma?.disabled ?? '', v => updateInferenceToggle('queryPragma', 'disabled', v))}
								</div>
							</section>
						</>
					) : (
						<p className="text-muted">Enable per query reasoning on the General tab to configure details.</p>
					)}
				</vscode-tab-panel>
			</vscode-tabs>
		</div>
	);
}
