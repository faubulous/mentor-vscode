import { useState } from 'react';
import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';

import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-button';
import '@vscode-elements/elements/dist/vscode-icon';

interface ShaclGraphEntry {
	includeDefaults: boolean;
	includeShapes: string[];
	excludeShapes: string[];
}

export interface ValidationSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function ValidationSection({ settings, onUpdate, onScopeChange, onBulkScope }: ValidationSectionProps) {
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
