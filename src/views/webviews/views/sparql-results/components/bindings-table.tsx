import { memo } from 'react';
import { Quad, Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { NTriplesSerializer } from '@faubulous/mentor-rdf-serializers';
import { extractFromClauseGraphUris } from '@faubulous/mentor-rdf-parsers';
import { BindingsResult, SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { useStylesheet } from '@src/views/webviews/hooks';
import { WebviewMessaging } from '@src/views/webviews/webview-messaging';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { SparqlResultsContextProps } from '../helpers/sparql-results-context';
import { withSparqlResults } from '../helpers/sparql-results-hoc';
import { getGraphVariables } from '../helpers/graph-variables';
import { BindingsTablePagingState } from './bindings-table-paging-state';
import stylesheet from './bindings-table.css';

const ntriplesSerializer = new NTriplesSerializer();

/**
 * Width, in pixels, of the leading row-number column.
 */
const ROW_NUMBER_COLUMN_WIDTH = 50;

/**
 * Minimum width, in pixels, given to each binding column before the table scrolls horizontally.
 */
const MIN_COLUMN_WIDTH = 150;

/**
 * Properties of the bindings table content.
 */
interface BindingsTableContentProps {
	/**
	 * The execution state of the query whose results are shown.
	 */
	queryContext: SparqlQueryExecutionState;

	/**
	 * Messaging used to run commands for the clicked cells.
	 */
	messaging?: WebviewMessaging<SparqlResultsWebviewMessages>;

	/**
	 * The filtered bindings result, or `null` when the query returned no bindings.
	 */
	result: BindingsResult | null;

	/**
	 * The page of the result that is shown.
	 */
	paging: BindingsTablePagingState;

	/**
	 * Whether a search term is entered, which changes the message shown when no row is left.
	 */
	hasSearchTerm: boolean;
}

/**
 * Returns the key that decides when the `vscode-table` element is re-created. The table sizes
 * its columns only when its header or body element is slotted, and it caches the cells of the
 * first body row it sized. It is therefore re-created when another result is shown (other
 * columns) and when rows appear after none were shown (a new first row). Page and filter changes
 * keep the table: rows are keyed by their position on the page, so the sized first-row cells
 * are reused and only their content changes.
 * @param queryContext The execution state of the query whose results are shown.
 * @param hasVisibleRows Whether the current page shows any row.
 * @returns The key of the table element.
 */
function getTableLayoutKey(queryContext: SparqlQueryExecutionState, hasVisibleRows: boolean): string {
	return `${queryContext.id}:${queryContext.endTime}:${hasVisibleRows}`;
}

/**
 * Component to display SPARQL bindings results in a table with pagination.
 */
function BindingsTableBase({ sparqlResults }: SparqlResultsContextProps) {
	useStylesheet('bindings-table-styles', stylesheet);

	const { queryContext, paging, messaging, filteredResult, searchTerm } = sparqlResults;

	if (!paging) {
		return <div>Loading...</div>;
	}

	return (
		<BindingsTableContent
			queryContext={queryContext}
			messaging={messaging}
			result={filteredResult ?? null}
			paging={paging}
			hasSearchTerm={!!searchTerm} />
	);
}

/**
 * Renders the rows of the current page. Kept apart from the context consumer and memoized so
 * that typing in the filter field, which updates the context on every keystroke, does not
 * re-render the rows until the debounced filter result changes.
 */
function BindingsTableContentBase({ queryContext, messaging, result, paging, hasSearchTerm }: BindingsTableContentProps) {
	// Determine which binding variables are named graphs
	const graphHeaders = result ? getGraphVariables(queryContext.query) : new Set<string>();

	const handleContextMenu = (event: React.MouseEvent) => {
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
		// Forward the graph URIs from the query's FROM clauses (when any) and the exact
		// connection the query ran against, so the describe reuses that connection rather
		// than re-resolving it from the source document.
		const graphUris = extractFromClauseGraphUris(queryContext.query);

		messaging?.postMessage({
			id: 'ExecuteCommand',
			command: 'mentor.command.executeDescribeQuery',
			args: [
				queryContext.documentIri ?? '',
				node.value,
				graphUris.length > 0 ? graphUris : undefined,
				queryContext.connectionId,
			]
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
					onClick={() => handleCopyColumnClick(column, result!)}>
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

	const getBlankNodeLabel = (binding: Term) => (
		<span>_:<span className="label">{binding.value}</span></span>
	);

	/**
	 * Renders the inline content of a node without cell wrapper or actions.
	 */
	const renderNodeContent = (binding: Term, namespaceMap?: Record<string, string>, isGraph?: boolean): React.ReactNode => {
		switch (binding.termType) {
			case 'NamedNode': {
				const clickHandler = isGraph ? handleOpenGraph : handleDescribeNamedNode;
				const tooltip = isGraph ? 'Serialize Graph' : 'Describe Resource';

				return (
					<a href="#" title={tooltip} onClick={(e) => { e.preventDefault(); clickHandler(binding); }}>
						{getNamedNodeLabel(binding, namespaceMap)}
					</a>
				);
			}
			case 'BlankNode':
				return (
					<a href="#" title="Describe Resource" onClick={(e) => { e.preventDefault(); handleDescribeNamedNode(binding); }}>
						{getBlankNodeLabel(binding)}
					</a>
				);
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
				// The copy button is rendered last so it stays the right-most action in every
				// cell, keeping it aligned with the copy button in the column header.
				if (isGraph) {
					return (
						<>
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
							<vscode-toolbar-button
								title="Copy Cell Value"
								onClick={() => handleCopyCellClick(binding)}>
								<span className="codicon codicon-copy"></span>
							</vscode-toolbar-button>
						</>
					);
				} else {
					return (
						<>
							<vscode-toolbar-button
								title="Open in Browser"
								onClick={() => handleNamedNodeClick(binding)}>
								<span className="codicon codicon-link-external"></span>
							</vscode-toolbar-button>
							<vscode-toolbar-button
								title="Copy Cell Value"
								onClick={() => handleCopyCellClick(binding)}>
								<span className="codicon codicon-copy"></span>
							</vscode-toolbar-button>
						</>
					);
				}
			case 'BlankNode':
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
		const minWidth = ROW_NUMBER_COLUMN_WIDTH + result.columns.length * MIN_COLUMN_WIDTH;
		const visibleRows = result.rows.slice(paging.startIndex, paging.endIndex);

		return (
			<vscode-table className="bindings-table" zebra bordered-rows resizable
				columns={["50px"]} key={getTableLayoutKey(queryContext, visibleRows.length > 0)}
				style={{ minWidth: `${minWidth}px` }}
				onContextMenu={handleContextMenu}>
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
					{visibleRows.map((row, rowIndex) => (
						<vscode-table-row key={rowIndex}>
							<vscode-table-cell key="row-number">
								{paging.startIndex + rowIndex + 1}
							</vscode-table-cell>
							{result.columns.map(header => (
								<vscode-table-cell key={'var-' + header}>
									{renderCell(row[header], header, result.namespaceMap)}
								</vscode-table-cell>
							))}
						</vscode-table-row>
					))}
					{result.rows.length === 0 && (
						<vscode-table-row>
							<vscode-table-cell>
								{hasSearchTerm ? 'No results match the search.' : 'No results'}
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
 * Memoized bindings table content; see {@link BindingsTableContentBase}.
 */
const BindingsTableContent = memo(BindingsTableContentBase);

/**
 * BindingsTable component wrapped with a SPARQL results context.
 */
export const SparqlResultsBindingsTable = withSparqlResults(BindingsTableBase);