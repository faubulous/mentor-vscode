import { useState, useCallback, useEffect } from 'react';
import { BindingsResult } from '@/services/sparql-query-state';
import { BindingsTablePagingState } from './bindings-table-paging-state';

/**
 * Custom hook for managing pagination state in a SPARQL bindings table.
 * @param result The result dataset.
 * @param defaultPageSize The default page size.
 * @returns An object containing pagination state and control functions.
 */
export function useBindingsTablePaging(result?: BindingsResult, defaultPageSize?: number) {
	const [paging, setPaging] = useState<BindingsTablePagingState | undefined>();

	// Initialize paging when result changes
	useEffect(() => {
		if (result) {
			setPaging(new BindingsTablePagingState(result, 0, defaultPageSize));
		} else {
			setPaging(undefined);
		}
	}, [result]);

	const updatePage = useCallback((page: number) => {
		if (paging && result) {
			setPaging(new BindingsTablePagingState(result, page, paging.pageSize));
		}
	}, [paging, result]);

	const updatePageSize = useCallback((pageSize: number) => {
		if (paging && result) {
			setPaging(new BindingsTablePagingState(result, 0, pageSize));
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