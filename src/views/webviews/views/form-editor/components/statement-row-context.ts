import { IResourceDataService } from '../services/resource-data-service.interface';

/**
 * Where a statement row stands: the card it belongs to and how deep it is nested.
 */
export interface StatementRowContext {
	/**
	 * Supplies the statements of the blank nodes the values refer to.
	 */
	dataService: IResourceDataService;

	/**
	 * The nesting depth of the row: zero for a card of the list.
	 */
	depth: number;

	/**
	 * The resources that hold the row, which guard against cycles.
	 */
	visited: readonly string[];
}
