import { createContext } from 'react';
import { WebviewMessaging } from '@/webviews/webview-messaging';
import { SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { useBindingsTablePaging } from '../components/bindings-table-paging-hook';

/**
 * Interface for SPARQL results contexts that are provided to React components.
 * This interface centralizes all state and actions related to SPARQL query results,
 * including query execution state, messaging with the VS Code extension host,
 * and table paging controls.
 * 
 * By using this interface in a React context, components throughout the webview 
 * can consistently access and interact with SPARQL results, regardless of their 
 * position in the component tree. This enables better separation of concerns, 
 * easier testing, and more flexible composition of UI features.
 */
export interface SparqlResultsContextType {
	/**
	 * The current SPARQL query execution state, including query text, status,
	 * results, and any errors.
	 */
	queryContext: SparqlQueryExecutionState;

	/**
	 * Messaging interface for sending and receiving messages to/from the VS Code extension host.
	 */
	messaging: WebviewMessaging<SparqlResultsWebviewMessages>;

	/**
	 * Paging controls for the bindings table.
	 */
	paging?: ReturnType<typeof useBindingsTablePaging>['paging'];

	/**
	 * Change the current page number.
	 */
	updatePage: (page: number) => void;

	/**
	 * Change the number of results per page.
	 */
	updatePageSize: (size: number) => void;

	/**
	 * Go to the next page of results.
	 */
	nextPage: () => void;
	
	/**
	 * Go to the previous page of results.
	 */
	previousPage: () => void;
}

/**
 * Props for components that consume the SPARQL results context.
 */
export interface SparqlResultsContextProps {
	/**
	 * The current SPARQL query execution state to provide in context.
	 */
	sparqlResults: SparqlResultsContextType;
}

/**
 * React context for providing SPARQL results state and actions to components.
 * Components can consume this context to access the current SPARQL query execution
 * state, send messages to the VS Code extension host, and control table paging.
 * 
 * It should be used within a SparqlResultsProvider that initializes
 * the context value based on the current query execution state and messaging.
 */
export const SparqlResultsContext = createContext<SparqlResultsContextType | null>(null);
