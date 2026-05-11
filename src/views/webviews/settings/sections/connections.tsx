import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';
import { getConfigurationScopeLabel } from '@src/utilities/config-scope';
import { TestResult } from '../components/types';

import '@vscode-elements/elements/dist/vscode-button';
import '@vscode-elements/elements/dist/vscode-icon';

export interface ConnectionsSectionProps {
	connections: SparqlConnection[];
	testResults: Record<string, TestResult>;
	onCreateConnection: () => void;
	onEditConnection: (connection: SparqlConnection) => void;
	onDeleteConnection: (connection: SparqlConnection) => void;
	onTestConnection: (connection: SparqlConnection) => void;
	onListGraphs: (connection: SparqlConnection) => void;
	onOpenInBrowser: (url: string) => void;
}

export function ConnectionsSection({
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
