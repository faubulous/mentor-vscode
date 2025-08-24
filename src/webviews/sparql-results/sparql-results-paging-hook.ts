import { useState, useCallback, useEffect } from 'react';
import { SparqlResultsPagingState } from './sparql-results-paging-state';
import { BindingsResult } from '@/services/sparql-query-state';

export function useSparqlResultsPaging(result?: BindingsResult, defaultPageSize?: number) {
	const [paging, setPaging] = useState<SparqlResultsPagingState | undefined>();

	// Initialize paging when result changes
	useEffect(() => {
		if (result) {
			setPaging(new SparqlResultsPagingState(result, 0, defaultPageSize));
		} else {
			setPaging(undefined);
		}
	}, [result]);

	const updatePage = useCallback((page: number) => {
		if (paging && result) {
			setPaging(new SparqlResultsPagingState(result, page, paging.pageSize));
		}
	}, [paging, result]);

	const updatePageSize = useCallback((pageSize: number) => {
		if (paging && result) {
			setPaging(new SparqlResultsPagingState(result, 0, pageSize));
		}
	}, [paging, result]);

	const nextPage = useCallback(() => {
		if (paging && paging.currentPage < paging.totalPages - 1) {
			updatePage(paging.currentPage + 1);
		}
	}, [paging, updatePage]);

	const previousPage = useCallback(() => {
		if (paging && paging.currentPage > 0) {
			updatePage(paging.currentPage - 1);
		}
	}, [paging, updatePage]);

	return {
		paging,
		updatePage,
		updatePageSize,
		nextPage,
		previousPage
	};
}