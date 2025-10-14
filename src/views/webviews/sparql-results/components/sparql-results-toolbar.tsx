import { Fragment } from 'react/jsx-runtime';
import { WebviewComponent } from '@src/views/webviews/webview-component';
import { BindingsResult } from '@src/services/sparql-query-state';
import { BindingsTablePagingState } from './bindings-table-paging-state';
import { Stopwatch } from './stopwatch';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { withSparqlResults } from '../helpers/sparql-results-hoc';
import toolbarStyle from "./sparql-results-toolbar.css";

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsToolbarBase extends WebviewComponent<SparqlResultsContextProps> {

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('mentor-sparql-toolbar-styles', toolbarStyle);
	}

	render() {
		const { queryContext, paging } = this.props.sparqlResults;
		const bindings = queryContext.result?.type === 'bindings' ? queryContext.result as BindingsResult : null;

		return (
			<vscode-toolbar-container className="sparql-results-toolbar">
				<Stopwatch />
				<span className="divider divider-vertical" style={{ marginLeft: '6px' }}></span>
				<vscode-toolbar-button title="Reload" onClick={() => this._reloadQuery()}>
					<vscode-icon name="debug-restart" className="debug-restart"></vscode-icon>
				</vscode-toolbar-button>

				{queryContext.error && (
					<Fragment>
						<span className="divider divider-vertical"></span>
						<vscode-icon name="error" className='error'></vscode-icon>
						<span>Error:</span>
					</Fragment>
				)}

				{!queryContext.error && !queryContext.endTime && (
					<Fragment>
						<span className="divider divider-vertical"></span>
						<vscode-icon name="sync" spin></vscode-icon>
						<span>Executing...</span>
					</Fragment>
				)}

				{!queryContext.error && bindings && paging && (
					<Fragment>
						<span className="divider divider-vertical"></span>
						<select className="sparql-results-page-size-select"
							value={paging.pageSize}
							onChange={this._handlePageSizeChange}
							disabled={bindings.rows.length <= paging.pageSize}>
							{paging.pageSizeOptions.map(option => (
								<option key={option} value={option}>{option}</option>
							))}
						</select>
						<span className="divider divider-vertical"></span>
						<vscode-toolbar-button
							title="Previous page"
							onClick={() => this._handlePreviousPage()}
							disabled={paging.currentPage === 0}
						>
							<vscode-icon name="chevron-left"></vscode-icon>
						</vscode-toolbar-button>
						<vscode-toolbar-button
							title="Next page"
							onClick={() => this._handleNextPage()}
							disabled={paging.currentPage >= paging.totalPages - 1}
						>
							<vscode-icon name="chevron-right"></vscode-icon>
						</vscode-toolbar-button>
						<span className="sparql-results-range">
							{this._getResultsRangeText(bindings, paging)}
						</span>
					</Fragment>
				)}

				{!queryContext.error && queryContext.result && (
					<Fragment>
						<span className="divider divider-vertical"></span>
						<vscode-toolbar-button title="Save" onClick={() => this._saveResults()}>
							CSV
						</vscode-toolbar-button>
					</Fragment>
				)}

				<span className="spacer"></span>
			</vscode-toolbar-container>
		);
	}

	private _getResultsRangeText(bindings: BindingsResult, paging: BindingsTablePagingState): string {
		const totalRows = bindings.rows.length;
		const startIndex = Math.min(paging.startIndex + 1, paging.endIndex);
		const endIndex = Math.min(paging.endIndex, bindings.rows.length);

		return `${startIndex} - ${endIndex} of ${totalRows} rows`;
	}

	private _handlePreviousPage = () => {
		this.props.sparqlResults.previousPage();
	};

	private _handleNextPage = () => {
		this.props.sparqlResults.nextPage();
	};

	private _handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const pageSize = parseInt(event.target.value);

		this.props.sparqlResults.updatePageSize(pageSize);
	};

	private _reloadQuery() {
		const { queryContext, messaging } = this.props.sparqlResults;

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
	}

	private _saveResults() {
		const { queryContext, messaging } = this.props.sparqlResults;

		messaging.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.saveSparqlQueryResults',
			args: [queryContext, 'csv']
		});
	}
}

export const SparqlResultsToolbar = withSparqlResults(SparqlResultsToolbarBase);