import { useContext, ReactNode } from 'react';
import { SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { BindingsResult } from '@/services/sparql-query-state';
import { useBindingsTablePaging } from '../components/bindings-table-paging-hook';
import { WebviewMessaging } from '@/webviews/webview-messaging';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { SparqlResultsContext, SparqlResultsContextType } from './sparql-results-context';

/**
 * Props for the SparqlResultsProvider component.
 */
export interface SparqlResultsProviderProps {
	/**
	 * Child components that will have access to the SPARQL results context.
	 */
	children: ReactNode;

	/**
	 * The current SPARQL query execution state to provide in context.
	 */
	queryContext: SparqlQueryExecutionState;

	/**
	 * Messaging interface for sending and receiving messages to/from the VS Code extension host.
	 */
	messaging: WebviewMessaging<SparqlResultsWebviewMessages>;

	/**
	 * The default number of results to display per page.
	 */
	defaultPageSize: number;
}

/**
 * Provider component for SPARQL results context.
 * @param param0 Props for the SparqlResultsProvider component.
 * @returns A React component that provides SPARQL results context to its children.
 */
export function SparqlResultsProvider({ children, queryContext, messaging, defaultPageSize }: SparqlResultsProviderProps) {
	const result = queryContext.result?.type === 'bindings'
		? queryContext.result as BindingsResult
		: undefined;

	const {
		paging,
		updatePage,
		updatePageSize,
		nextPage,
		previousPage
	} = useBindingsTablePaging(result, defaultPageSize);

	const contextValue: SparqlResultsContextType = {
		queryContext,
		messaging,
		paging,
		updatePage,
		updatePageSize,
		nextPage,
		previousPage
	};

	return (
		<SparqlResultsContext.Provider value={contextValue}>
			{children}
		</SparqlResultsContext.Provider>
	);
}

/**
 * Custom hook for accessing the SPARQL results context. This can be used within
 * any component that is a descendant of a SparqlResultsProvider to access the
 * current SPARQL query execution state, messaging, and paging controls.
 * @returns The current SPARQL results context.
 * @throws Error if used outside of a SparqlResultsProvider.
 */
export function useSparqlResults() {
	const context = useContext(SparqlResultsContext);

	if (!context) {
		throw new Error('useSparqlResults must be used within SparqlResultsProvider');
	}

	return context;
}