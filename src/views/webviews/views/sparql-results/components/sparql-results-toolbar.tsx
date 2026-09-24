import { Fragment } from 'react/jsx-runtime';
import { useEffect, useState } from 'react';
import { useStylesheet } from '@src/views/webviews/hooks';
import { BindingsResult } from '@src/languages/sparql/services/sparql-query-state';
import type { BindingsFormat, ResultsExportTarget } from '@src/languages/sparql/services/bindings-formatter';
import { BindingsTablePagingState } from './bindings-table-paging-state';
import { Stopwatch } from './stopwatch';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { withSparqlResults } from '../helpers/sparql-results-hoc';
import toolbarStyle from "./sparql-results-toolbar.css";

/**
 * Returns the wording used for an export target in the button tooltips.
 * @param target The target the results are sent to.
 * @returns The label of the target.
 */
function getExportTargetLabel(target: ResultsExportTarget): string {
	return target === 'clipboard' ? 'the clipboard' : 'a new document';
}

/**
 * Component to display SPARQL results toolbar with pagination and actions.
 */
function SparqlResultsToolbarBase({ sparqlResults }: SparqlResultsContextProps) {
	useStylesheet('mentor-sparql-toolbar-styles', toolbarStyle);

	const { queryContext, paging, messaging, previousPage, nextPage, updatePageSize, filteredResult, searchTerm, setSearchTerm } = sparqlResults;
	const bindings = filteredResult ?? null;

	// The webview cannot read settings, so the configured default is requested from the host.
	// Until it answers, the dropdown shows the same default as the setting.
	const [exportTarget, setExportTarget] = useState<ResultsExportTarget>('document');

	useEffect(() => {
		if (!messaging) {
			return;
		}

		const unsubscribe = messaging.onMessage(message => {
			if (message.id === 'PostResultsExportTarget') {
				setExportTarget(message.target);
			}
		});

		messaging.postMessage({ id: 'GetResultsExportTarget' });

		return unsubscribe;
	}, [messaging]);

	const getResultsRangeText = (bindings: BindingsResult, paging: BindingsTablePagingState): string => {
		const totalRows = bindings.rows.length;
		const startIndex = Math.min(paging.startIndex + 1, paging.endIndex);
		const endIndex = Math.min(paging.endIndex, bindings.rows.length);

		return `${startIndex} - ${endIndex} of ${totalRows} rows`;
	};

	const handlePreviousPage = () => {
		previousPage();
	};

	const handleNextPage = () => {
		nextPage();
	};

	const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const pageSize = parseInt(event.target.value);
		updatePageSize(pageSize);
	};

	const cancelQuery = () => {
		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.cancelSparqlQueryExecution',
			args: [queryContext.id]
		});
	};

	const reloadQuery = () => {
		if (queryContext.documentIri) {
			messaging?.postMessage({
				id: 'ExecuteCommand',
				command: 'mentor.command.executeSparqlQuery',
				args: [{
					documentIri: queryContext.documentIri,
					workspaceIri: queryContext.workspaceIri,
					notebookIri: queryContext.notebookIri,
					cellIndex: queryContext.cellIndex,
					connectionId: queryContext.connectionId,
					query: queryContext.query,
					label: queryContext.label
				}]
			});
		} else {
			messaging?.postMessage({
				id: 'ExecuteCommand',
				command: 'mentor.command.executeSparqlQuery',
				args: [{
					connectionId: queryContext.connectionId,
					query: queryContext.query,
					label: queryContext.label
				}]
			});
		}
	};

	// Sends the results in the chosen format to the selected target. The filtered rows are
	// exported so the output reflects the active search filter.
	const exportResults = (format: BindingsFormat) => {
		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: exportTarget === 'clipboard'
				? 'mentor.command.copySparqlQueryResults'
				: 'mentor.command.saveSparqlQueryResults',
			args: [{ ...queryContext, result: filteredResult ?? queryContext.result }, format]
		});
	};

	const handleExportTargetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setExportTarget(event.target.value as ResultsExportTarget);
	};

	const viewRawResponse = () => {
		messaging?.postMessage({
			id: 'OpenRawResponse',
			queryId: queryContext.id
		});
	};

	const editQuery = () => {
		// Generated queries (e.g. rendered triplate templates) carry the template's documentIri but
		// their query text differs from it, so reveal the query text instead of the source document.
		if (queryContext.documentIri && !queryContext.isGenerated) {
			messaging?.postMessage({
				id: 'ExecuteCommand',
				command: 'mentor.command.openDocument',
				args: [queryContext.documentIri, queryContext.query]
			});
		} else {
			messaging?.postMessage({
				id: 'EditBackgroundQuery',
				queryId: queryContext.id
			});
		}
	};

	return (
		<vscode-toolbar-container className="sparql-results-toolbar">
			<vscode-toolbar-button title="Edit query" onClick={() => editQuery()} className="not-notebook">
				<span className="codicon codicon-file-code"></span>
			</vscode-toolbar-button>

			<span className="divider divider-vertical not-notebook"></span>

			<Stopwatch />

			<span className="divider divider-vertical"></span>

			{queryContext.error && (
				<Fragment>
					<vscode-toolbar-button title="Reload" onClick={() => reloadQuery()}>
						<span className="codicon codicon-debug-restart"></span>
					</vscode-toolbar-button>
				</Fragment>
			)}

			{queryContext.error && !queryContext.error.cancelled && (
				<Fragment>
					<span className="divider divider-vertical"></span>
					<span className="codicon codicon-error"></span>
					<span>Error:</span>
				</Fragment>
			)}

			{!queryContext.error && !queryContext.endTime && (
				<Fragment>
					<vscode-toolbar-button title="Cancel" onClick={() => cancelQuery()}>
						<span className="codicon codicon-debug-stop"></span>
					</vscode-toolbar-button>
					<span className="divider divider-vertical"></span>
					<span className="codicon codicon-sync codicon-modifier-spin"></span>
					<span>Executing...</span>
				</Fragment>
			)}

			{!queryContext.error && queryContext.endTime && (
				<Fragment>
					<vscode-toolbar-button title="Reload" onClick={() => reloadQuery()}>
						<span className="codicon codicon-debug-restart"></span>
					</vscode-toolbar-button>
				</Fragment>
			)}

			{!queryContext.error && bindings && paging && (
				<Fragment>
					<span className="divider divider-vertical"></span>
					<select className="sparql-results-page-size-select"
						value={paging.pageSize}
						onChange={handlePageSizeChange}
						disabled={bindings.rows.length <= paging.pageSize}>
						{paging.pageSizeOptions.map(option => (
							<option key={option} value={option}>{option}</option>
						))}
					</select>
					<span className="divider divider-vertical"></span>
					<vscode-toolbar-button
						title="Previous page"
						onClick={() => handlePreviousPage()}
						disabled={paging.currentPage === 0}
					>
						<span className="codicon codicon-chevron-left"></span>
					</vscode-toolbar-button>
					<vscode-toolbar-button
						title="Next page"
						onClick={() => handleNextPage()}
						disabled={paging.currentPage >= paging.totalPages - 1}
					>
						<span className="codicon codicon-chevron-right"></span>
					</vscode-toolbar-button>
					<span className="sparql-results-range">
						{getResultsRangeText(bindings, paging)}
					</span>
				</Fragment>
			)}


			{!queryContext.error && bindings && (
				<Fragment>
					<span className="divider divider-vertical"></span>
					<vscode-textfield
						className="sparql-results-search"
						placeholder="Filter results…"
						value={searchTerm}
						onInput={(e: React.FormEvent<HTMLElement>) => setSearchTerm((e.target as HTMLInputElement).value)}>
						<vscode-icon slot="content-before" name="search"></vscode-icon>
						{searchTerm && (
							<vscode-icon
								slot="content-after"
								name="close"
								title="Clear filter"
								action-icon
								onClick={() => setSearchTerm('')}>
							</vscode-icon>
						)}
					</vscode-textfield>
				</Fragment>
			)}

			{!queryContext.error && queryContext.result && (
				<Fragment>
					<span className="divider divider-vertical"></span>

					<vscode-toolbar-button title={`Export as CSV to ${getExportTargetLabel(exportTarget)}`} onClick={() => exportResults('csv')}>
						CSV
					</vscode-toolbar-button>
					<vscode-toolbar-button title={`Export as a Markdown table to ${getExportTargetLabel(exportTarget)}`} onClick={() => exportResults('markdown')}>
						MD
					</vscode-toolbar-button>
					<select className="sparql-results-export-target-select"
						title="Where the exported results are sent"
						value={exportTarget}
						onChange={handleExportTargetChange}>
						<option value="document">New Document</option>
						<option value="clipboard">Clipboard</option>
					</select>
					<span className="divider divider-vertical"></span>
					<vscode-toolbar-button disabled={!queryContext.rawResponse} title="View raw response" onClick={() => viewRawResponse()}>
						JSON
					</vscode-toolbar-button>
				</Fragment>
			)}
		</vscode-toolbar-container>
	);
}

export const SparqlResultsToolbar = withSparqlResults(SparqlResultsToolbarBase);