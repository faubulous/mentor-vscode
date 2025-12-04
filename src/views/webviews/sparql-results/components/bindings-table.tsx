import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { BindingsResult } from '@src/services/sparql-query-state';
import { WebviewComponent } from '@src/views/webviews/webview-component';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { withSparqlResults } from '../helpers/sparql-results-hoc';
import stylesheet from './bindings-table.css';

/**
 * Component to display SPARQL bindings results in a table with pagination.
 */
class BindingsTableBase extends WebviewComponent<
	SparqlResultsContextProps,
	{},
	SparqlResultsWebviewMessages
> {
	private _renderKey: number = 0;

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('bindings-table-styles', stylesheet);
	}

	render() {
		this._renderKey++;

		const { queryContext, paging } = this.props.sparqlResults;

		if (!paging) {
			return <div>Loading...</div>;
		}

		const result = queryContext.result?.type === 'bindings'
			? queryContext.result as BindingsResult
			: null;

		if (result) {
			return (
				<vscode-table className="bindings-table" zebra bordered-rows resizable
					columns={["50px"]} key={this._renderKey}
					onClick={(e) => this._handleRightClick(e)}>
					{result.rows.length > 0 &&
						<vscode-table-header>
							<vscode-table-header-cell key="row-number">
							</vscode-table-header-cell>
							{result.columns.map(v => (
								<vscode-table-header-cell key={'var-' + v}>
									{this._renderHeaderCell(v)}
								</vscode-table-header-cell>
							))}
						</vscode-table-header>
					}
					<vscode-table-body>
						{result.rows.length > 0 && result.rows.slice(paging.startIndex, paging.endIndex).map((row, rowIndex) => (
							<vscode-table-row key={paging.startIndex + rowIndex}>
								<vscode-table-cell key={`row-number-${paging.startIndex + rowIndex}`}>
									{paging.startIndex + rowIndex + 1}
								</vscode-table-cell>
								{result.columns.map(header => (
									<vscode-table-cell key={`${paging.startIndex + rowIndex}-${header}`}>
										{this._renderCell(row[header], result.namespaceMap)}
									</vscode-table-cell>
								))}
							</vscode-table-row>
						))}
						{result.rows.length === 0 && (
							<vscode-table-row>
								<vscode-table-cell>
									No results
								</vscode-table-cell>
							</vscode-table-row>
						)}
					</vscode-table-body>
				</vscode-table>
			);
		} else if (!queryContext.error) {
			return <div>The query returned no results.</div>;
		}
	}

	private _handleRightClick(event: any) {
		// Do not show default context menu on right click.
		event.preventDefault();
	}

	private _renderHeaderCell(column: string) {
		return (
			<div className="cell">
				<div className="cell-value">{column}</div>
				<div className="cell-actions">
					<vscode-toolbar-button
						title="Copy Column Values"
						onClick={() => this._handleCopyColumnClick(column, this.props.sparqlResults.queryContext.result as BindingsResult)}>
						<span className="codicon codicon-copy"></span>
					</vscode-toolbar-button>
				</div>
			</div>
		);
	}

	private _renderCell(binding: Term | undefined, namespaceMap?: Record<string, string>) {
		switch (binding?.termType) {
			case 'NamedNode': {
				return this._renderNamedNode(binding, namespaceMap);
			}
			case 'BlankNode': {
				return this._renderBlankNode(binding);
			}
			case 'Literal': {
				return this._renderLiteral(binding);
			}
			default: {
				return '';
			}
		}
	}

	private _renderNamedNode(binding: Term, namespaceMap?: Record<string, string>) {
		let value = (<span className="label">{binding.value}</span>);

		const namespaceIri = Uri.getNamespaceIri(binding.value);
		const prefix = namespaceMap ? namespaceMap[namespaceIri] : undefined;

		if (prefix) {
			const localName = binding.value.replace(namespaceIri, '');

			value = (<span>{prefix}:<span className="label">{localName}</span></span>);
		}

		return (
			<div className="cell">
				<pre className="cell-value">
					<a href="#" onClick={() => this._handleDescribeNamedNode(binding)}>
						{value}
					</a>
				</pre>
				<div className="cell-actions">
					<vscode-toolbar-button
						title="Open in Browser"
						onClick={() => this._handleNamedNodeClick(binding)}>
						<span className="codicon codicon-link-external"></span>
					</vscode-toolbar-button>
					<vscode-toolbar-button
						title="Copy Cell Value"
						onClick={() => this._handleCopyCellClick(binding)}>
						<span className="codicon codicon-copy"></span>
					</vscode-toolbar-button>
				</div>
			</div>
		);
	}

	private _renderBlankNode(binding: Term) {
		return (<pre>{binding.value}</pre>);
	}

	private _renderLiteral(binding: Term) {
		return (
			<div className="cell">
				<pre className="cell-value">
					{binding.value}
				</pre>
				<div className="cell-actions">
					<vscode-toolbar-button
						title="Copy Cell Value"
						onClick={() => this._handleCopyCellClick(binding)}>
						<span className="codicon codicon-copy"></span>
					</vscode-toolbar-button>
				</div>
			</div>
		);
	}

	private _handleCopyColumnClick(column: string, result: BindingsResult) {
		const values = result.rows.map(row => row[column]?.value ?? '').join('\n');

		navigator.clipboard.writeText(values);
	}

	private _handleCopyCellClick(binding: Term) {
		navigator.clipboard.writeText(binding.value);
	}

	private _handleDescribeNamedNode(node: Term) {
		const { messaging, queryContext } = this.props.sparqlResults;
		const value = node.value;

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.executeDescribeQuery',
			args: [queryContext.documentIri, value]
		})
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