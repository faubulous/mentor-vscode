import { BindingsResult } from '@/services/sparql-query-state';
import { SparqlResultsContextType } from './sparql-results-context';
import { withSparqlResults } from './sparql-results-hoc';
import { WebviewComponent } from '@/webviews/webview-component';
import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';

interface SparqlResultsBindingsTableProps {
	sparqlResults: SparqlResultsContextType;
}

class SparqlResultsBindingsTableBase extends WebviewComponent<SparqlResultsBindingsTableProps> {
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
					const localName = binding.value.substring(namespaceIri.length);
					return (<pre><a href={binding.value}>{prefix}:<span className='label'>{localName}</span></a></pre>);
				} else {
					return (<pre><a href={binding.value}>{binding.value}</a></pre>);
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
}

export const SparqlResultsBindingsTable = withSparqlResults(SparqlResultsBindingsTableBase);