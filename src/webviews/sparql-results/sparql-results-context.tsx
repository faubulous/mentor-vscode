import { createContext, useContext, ReactNode } from 'react';
import { SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { BindingsResult } from '@/services/sparql-query-state';
import { useSparqlResultsPaging } from './sparql-results-paging-hook';
import { WebviewMessaging } from '@/webviews/webview-messaging';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';

export interface SparqlResultsContextType {
	queryContext: SparqlQueryExecutionState;

	messaging: WebviewMessaging<SparqlResultsWebviewMessages>;

	paging?: ReturnType<typeof useSparqlResultsPaging>['paging'];

	updatePage: (page: number) => void;

	updatePageSize: (size: number) => void;

	nextPage: () => void;
	
	previousPage: () => void;
}

export interface SparqlResultsProviderProps {
	children: ReactNode;

	queryContext: SparqlQueryExecutionState;

	messaging: WebviewMessaging<SparqlResultsWebviewMessages>;
}

const SparqlResultsContext = createContext<SparqlResultsContextType | null>(null);

export function SparqlResultsProvider({ children, queryContext, messaging }: SparqlResultsProviderProps) {
	const result = queryContext.result?.type === 'bindings'
		? queryContext.result as BindingsResult
		: undefined;

	const {
		paging,
		updatePage,
		updatePageSize,
		nextPage,
		previousPage
	} = useSparqlResultsPaging(result);

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

export function useSparqlResults() {
	const context = useContext(SparqlResultsContext);

	if (!context) {
		throw new Error('useSparqlResults must be used within SparqlResultsProvider');
	}

	return context;
}