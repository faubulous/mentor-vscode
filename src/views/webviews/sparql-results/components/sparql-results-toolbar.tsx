import { Fragment } from 'react/jsx-runtime';
import { useStylesheet } from '@src/views/webviews/webview-hooks';
import { BindingsResult } from '@src/services/sparql-query-state';
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

	const { queryContext, paging, messaging, previousPage, nextPage, updatePageSize } = sparqlResults;
	const bindings = queryContext.result?.type === 'bindings' ? queryContext.result as BindingsResult : null;

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
		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.executeSparqlQuery',
			args: [{
				documentIri: queryContext.documentIri,
				workspaceIri: queryContext.workspaceIri,
				notebookIri: queryContext.notebookIri,
				cellIndex: queryContext.cellIndex,
				query: queryContext.query
			}]
		});
	};

	const saveResults = () => {
		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.saveSparqlQueryResults',
			args: [queryContext, 'csv']
		});
	};

	return (
		<vscode-toolbar-container className="sparql-results-toolbar">
			<Stopwatch />
			<span className="divider divider-vertical" style={{ marginLeft: '6px' }}></span>

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

			{!queryContext.error && queryContext.result && (
				<Fragment>
					<span className="divider divider-vertical"></span>
					<vscode-toolbar-button title="Save" onClick={() => saveResults()}>
						CSV
					</vscode-toolbar-button>
				</Fragment>
			)}

			<span className="spacer"></span>
		</vscode-toolbar-container>
	);
}

export const SparqlResultsToolbar = withSparqlResults(SparqlResultsToolbarBase);