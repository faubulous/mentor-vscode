import { Fragment } from 'react/jsx-runtime';
import { useStylesheet } from '@src/views/webviews/hooks';
import { BindingsResult } from '@src/languages/sparql/services/sparql-query-state';
import { BindingsTablePagingState } from './bindings-table-paging-state';
import { Stopwatch } from './stopwatch';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { withSparqlResults } from '../helpers/sparql-results-hoc';
import toolbarStyle from "./sparql-results-toolbar.css";

/**
 * Component to display SPARQL results toolbar with pagination and actions.
 */
function SparqlResultsToolbarBase({ sparqlResults }: SparqlResultsContextProps) {
	useStylesheet('mentor-sparql-toolbar-styles', toolbarStyle);

	const { queryContext, paging, messaging, previousPage, nextPage, updatePageSize, filteredResult, searchTerm, setSearchTerm } = sparqlResults;
	const bindings = filteredResult ?? null;

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

	const saveResults = () => {
		// Export the filtered rows so CSV reflects the active search filter.
		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.saveSparqlQueryResults',
			args: [{ ...queryContext, result: filteredResult ?? queryContext.result }, 'csv']
		});
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

					<vscode-toolbar-button title="Save" onClick={() => saveResults()}>
						CSV
					</vscode-toolbar-button>
					<vscode-toolbar-button disabled={!queryContext.rawResponse} title="View raw response" onClick={() => viewRawResponse()}>
						JSON
					</vscode-toolbar-button>
				</Fragment>
			)}
		</vscode-toolbar-container>
	);
}

export const SparqlResultsToolbar = withSparqlResults(SparqlResultsToolbarBase);