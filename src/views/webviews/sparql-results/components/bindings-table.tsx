import { useRef } from 'react';
import { Quad, Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { NTriplesSerializer } from '@faubulous/mentor-rdf-serializers';
import { BindingsResult } from '@src/languages/sparql/services/sparql-query-state';
import { useStylesheet } from '@src/views/webviews/webview-hooks';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { withSparqlResults } from '../helpers/sparql-results-hoc';
import stylesheet from './bindings-table.css';

const ntriplesSerializer = new NTriplesSerializer();

/**
 * Component to display SPARQL bindings results in a table with pagination.
 */
function BindingsTableBase({ sparqlResults }: SparqlResultsContextProps) {
	const renderKeyRef = useRef(0);

	useStylesheet('bindings-table-styles', stylesheet);

	const { queryContext, paging, messaging } = sparqlResults;

	// Increment render key on each render
	renderKeyRef.current++;

	if (!paging) {
		return <div>Loading...</div>;
	}

	const result = queryContext.result?.type === 'bindings' ?
		queryContext.result as BindingsResult : null;

	// Determine which binding variables are named graphs
	const graphHeaders = new Set<string>();

	if (result) {
		const graphExpression = /GRAPH\s+\?([a-zA-Z_][a-zA-Z0-9_]*)/ig;

		for (const column of graphExpression.exec(queryContext.query || '') || []) {
			graphHeaders.add(column);
		}
	}

	const handleRightClick = (event: React.MouseEvent) => {
		// Do not show default context menu on right click.
		event.preventDefault();
	};

	const handleCopyColumnClick = (column: string, result: BindingsResult) => {
		const values = result.rows.map(row => row[column]?.value ?? '').join('\n');
		navigator.clipboard.writeText(values);
	};

	const handleCopyCellClick = (binding: Term) => {
		navigator.clipboard.writeText(binding.value);
	};

	const handleOpenGraph = (node: Term) => {
		const value = node.value;

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.openGraph',
			args: [value]
		});
	};

	const handleDeleteGraph = (node: Term) => {
		const value = node.value;

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.deleteGraph',
			args: [queryContext.documentIri, value]
		});
	};

	const handleDescribeNamedNode = (node: Term) => {
		const value = node.value;

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.executeDescribeQuery',
			args: [queryContext.documentIri, value]
		});
	};

	const handleNamedNodeClick = (node: Term) => {
		const value = node.value;

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.openInBrowser',
			args: [value]
		});
	};

	const renderHeaderCell = (column: string) => (
		<div className="cell">
			<div className="cell-value">{column}</div>
			<div className="cell-actions">
				<vscode-toolbar-button
					title="Copy Column Values"
					onClick={() => handleCopyColumnClick(column, queryContext.result as BindingsResult)}>
					<span className="codicon codicon-copy"></span>
				</vscode-toolbar-button>
			</div>
		</div>
	);

	const getNamedNodeLabel = (binding: Term, namespaceMap?: Record<string, string>) => {
		let value = (<span className="label">{binding.value}</span>);

		const namespaceIri = Uri.getNamespaceIri(binding.value);
		const prefix = namespaceMap ? namespaceMap[namespaceIri] : undefined;

		if (prefix !== undefined) {
			const localName = binding.value.replace(namespaceIri, '');
			value = (<span>{prefix}:<span className="label">{localName}</span></span>);
		}

		return value;
	};

	/**
	 * Renders the inline content of a node without cell wrapper or actions.
	 */
	const renderNodeContent = (binding: Term, namespaceMap?: Record<string, string>, isGraph?: boolean): React.ReactNode => {
		switch (binding.termType) {
			case 'NamedNode': {
				const clickHandler = isGraph ? handleOpenGraph : handleDescribeNamedNode;

				return (
					<a href="#" onClick={() => clickHandler(binding)}>
						{getNamedNodeLabel(binding, namespaceMap)}
					</a>
				);
			}
			case 'BlankNode':
				return binding.value;
			case 'Literal':
				return binding.value;
			case 'Quad':
				return (
					<>
						{renderNodeContent(binding.subject, namespaceMap)}
						{' '}
						{renderNodeContent(binding.predicate, namespaceMap)}
						{' '}
						{renderNodeContent(binding.object, namespaceMap)}
						{' .'}
					</>
				);
			default:
				return '';
		}
	};

	/**
	 * Renders the action buttons for a cell based on the term type and context.
	 */
	const renderNodeActions = (binding: Term, isGraph: boolean): React.ReactNode => {
		switch (binding.termType) {
			case 'NamedNode':
				if (isGraph) {
					return (
						<>
							<vscode-toolbar-button
								title="Copy Cell Value"
								onClick={() => handleCopyCellClick(binding)}>
								<span className="codicon codicon-copy"></span>
							</vscode-toolbar-button>
							<vscode-toolbar-button
								title="Download Graph"
								onClick={() => handleOpenGraph(binding)}>
								<span className="codicon codicon-download"></span>
							</vscode-toolbar-button>
							<vscode-toolbar-button
								title="Delete Graph"
								onClick={() => handleDeleteGraph(binding)}>
								<span className="codicon codicon-trash"></span>
							</vscode-toolbar-button>
						</>
					);
				} else {
					return (
						<>
							<vscode-toolbar-button
								title="Copy Cell Value"
								onClick={() => handleCopyCellClick(binding)}>
								<span className="codicon codicon-copy"></span>
							</vscode-toolbar-button>
							<vscode-toolbar-button
								title="Open in Browser"
								onClick={() => handleNamedNodeClick(binding)}>
								<span className="codicon codicon-link-external"></span>
							</vscode-toolbar-button>
						</>
					);
				}
			case 'Literal':
				return (
					<vscode-toolbar-button
						title="Copy Cell Value"
						onClick={() => handleCopyCellClick(binding)}>
						<span className="codicon codicon-copy"></span>
					</vscode-toolbar-button>
				);
			case 'Quad':
				return (
					<vscode-toolbar-button
						title="Copy as N-Triples"
						onClick={() => navigator.clipboard.writeText(ntriplesSerializer.serializeQuad(binding as unknown as Quad))}>
						<span className="codicon codicon-copy"></span>
					</vscode-toolbar-button>
				);
			default:
				return null;
		}
	};

	const renderCell = (binding: Term | undefined, header: string, namespaceMap?: Record<string, string>) => {
		if (!binding) return '';

		const isGraph = graphHeaders.has(header);

		// Blank nodes get minimal rendering without cell wrapper
		if (binding.termType === 'BlankNode') {
			return <pre>{renderNodeContent(binding, namespaceMap)}</pre>;
		}

		return (
			<div className="cell">
				<pre className="cell-value">
					{renderNodeContent(binding, namespaceMap, isGraph)}
				</pre>
				<div className="cell-actions">
					{renderNodeActions(binding, isGraph)}
				</div>
			</div>
		);
	};

	if (result) {
		return (
			<vscode-table className="bindings-table" zebra bordered-rows resizable
				columns={["50px"]} key={renderKeyRef.current}
				onClick={handleRightClick}>
				{result.rows.length > 0 &&
					<vscode-table-header>
						<vscode-table-header-cell key="row-number">
						</vscode-table-header-cell>
						{result.columns.map(v => (
							<vscode-table-header-cell key={'var-' + v}>
								{renderHeaderCell(v)}
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
									{renderCell(row[header], header, result.namespaceMap)}
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

	return null;
}

/**
 * BindingsTable component wrapped with a SPARQL results context.
 */
export const SparqlResultsBindingsTable = withSparqlResults(BindingsTableBase);