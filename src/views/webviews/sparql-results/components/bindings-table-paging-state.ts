import { BindingsResult } from "@src/services/sparql-query-state";

/**
 * State for the SPARQL bindings pagination.
 */
export class BindingsTablePagingState {
	/**
	 * Available page size options, depending on the result set size.
	 */
	pageSizeOptions: number[];

	/**
	 * Currently selected page size.
	 */
	pageSize: number;

	/**
	 * Total number of pages available for the current result set.
	 */
	totalPages: number;

	/**
	 * Currently active page number.
	 */
	currentPage: number;

	/**
	 * Offset of the first item in the dataset.
	 */
	startIndex: number;

	/**
	 * Offset of the last item in the dataset.
	 */
	endIndex: number;

	constructor(bindings: BindingsResult, currentPage: number, pageSize: number = 100) {
		this.pageSizeOptions = this._getPageSizeOptions(bindings, pageSize);
		this.pageSize = this._getPageSize(bindings, pageSize);
		this.totalPages = Math.ceil(bindings.rows.length / this.pageSize);
		this.currentPage = currentPage;
		this.startIndex = currentPage * this.pageSize;
		this.endIndex = Math.min(this.startIndex + this.pageSize, bindings.rows.length);
	}

	private _getPageSizeOptions(bindings: BindingsResult, pageSize: number): number[] {
		const result = [100];

		bindings.rows.length >= 500 && result.push(500);
		bindings.rows.length >= 1000 && result.push(1000);
		bindings.rows.length >= 2000 && result.push(2000);
		bindings.rows.length >= 5000 && result.push(5000);

		if (!result.includes(pageSize)) {
			result.push(pageSize);
			result.sort()
			result.reverse();
		}

		return result;
	}

	private _getPageSize(bindings: BindingsResult, pageSize: number): number {
		return bindings.rows.length >= pageSize ? pageSize : this.pageSizeOptions[0];
	}
}