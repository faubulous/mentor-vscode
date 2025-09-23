import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { BindingsResult } from '@/services/sparql-query-state';
import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { withSparqlResults } from '../helpers/sparql-results-hoc';

/**
 * Component to display SPARQL bindings results in a table with pagination.
 */
class BindingsTableBase extends WebviewComponent<
	SparqlResultsContextProps,
	{},
	SparqlResultsWebviewMessages
> {
	render() {
		const { queryContext, paging } = this.props.sparqlResults;

		if (!paging) {
			return <div>Loading...</div>;
		}

		const result = queryContext.result?.type === 'bindings'
			? queryContext.result as BindingsResult
			: null;

		if (!result) {
			return <div>No bindings result available</div>;
		}

		return (
			<vscode-table className="sparql-results-table" zebra bordered-rows resizable>
				<vscode-table-header>
					{result.columns.map(v => (
						<vscode-table-header-cell key={v}>{v}</vscode-table-header-cell>
					))}
				</vscode-table-header>
				<vscode-table-body>
					{result.rows.slice(paging.startIndex, paging.endIndex).map((row, rowIndex) => (
						<vscode-table-row key={paging.startIndex + rowIndex}>
							{result.columns.map(header => (
								<vscode-table-cell key={`${paging.startIndex + rowIndex}-${header}`}>
									{this._renderCell(row[header], result.namespaceMap)}
								</vscode-table-cell>
							))}
						</vscode-table-row>
					))}
				</vscode-table-body>
			</vscode-table>
		);
	}

	private _renderCell(binding: Term | undefined, namespaceMap?: Record<string, string>) {
		switch (binding?.termType) {
			case 'NamedNode': {
				const namespaceIri = Uri.getNamespaceIri(binding.value);
				const prefix = namespaceMap ? namespaceMap[namespaceIri] : undefined;

				if (prefix) {
					const localName = binding.value.replace(namespaceIri, '');

					return (<pre><a href="#" onClick={() => this._handleNamedNodeClick(binding)}>{prefix}:<span className='label'>{localName}</span></a></pre>);
				} else {
					return (<pre><a href="#" onClick={() => this._handleNamedNodeClick(binding)}>{binding.value}</a></pre>);
				}
			}
			case 'BlankNode': {
				return (<pre>{binding.value}</pre>);
			}
			case 'Literal': {
				return (<pre>{binding.value}</pre>);
			}
			default: {
				return '';
			}
		}
	}

	private _handleNamedNodeClick(node: Term) {
		const { messaging } = this.props.sparqlResults;
		const value = node.value;

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.openInBrowser',
			args: [value]
		})
	}
}

/**
 * BindingsTable component wrapped with a SPARQL results context.
 */
export const SparqlResultsBindingsTable = withSparqlResults(BindingsTableBase);