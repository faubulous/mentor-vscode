import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { useStatementTextService } from '../hooks/use-statement-text-service';
import { StatementRowColumn } from '../hooks/use-statement-editor';
import { InputFieldElement } from '../input/input-field-element';
import { IEditingController } from '../state/editing-controller.interface';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { CellKey } from '../state/cell-key';
import { EditableStatement } from '../state/editable-statement';
import { PendingEdits } from '../state/pending-edits';
import { StatementDraft, StatementDrafts } from '../state/statement-drafts';
import { StatementEditor } from './statement-editor';
import { StatementRow } from './statement-list';

/**
 * Properties of the {@link EditableStatementList} component.
 */
export interface EditableStatementListProps {
	/**
	 * The resource with its statements.
	 */
	detail: ResourceDetail;

	/**
	 * Supplies the statements of the blank nodes the values refer to.
	 */
	dataService: IResourceDataService;

	/**
	 * The means to edit.
	 */
	editing: IEditingController;
}

/**
 * The statements of a card as editable rows, in document order, followed by the rows new
 * statements are typed into. A row is written when the focus leaves it: a changed statement is
 * rewritten, an emptied one removed, and a row for a new statement adds it. The arrows move
 * between the rows; Enter at the end of a row moves to the one below.
 * @param props The resource and the means to edit.
 * @returns The rows.
 */
export function EditableStatementList({ detail, dataService, editing }: EditableStatementListProps): React.JSX.Element {
	const service = useStatementTextService(detail);
	const [drafts, setDrafts] = useState(StatementDrafts.NONE);
	const [problems, setProblems] = useState<Readonly<Record<string, string>>>({});
	const listRef = useRef<HTMLDivElement>(null);
	const shown = new PendingEdits(editing.pendingEditsFor(detail.id)).applyTo(detail);
	const subject = detail.term;
	const visited = [detail.id];
	const languages = _languagesOf(shown);

	// The host delivered the card again: the drafts it has shown as statements go.
	useEffect(() => setDrafts(current => current.pruneSubmitted()), [detail]);

	// A row for a new statement is always at hand after the statements.
	useEffect(() => {
		if (!drafts.open) {
			setDrafts(current => current.opened());
		}
	}, [drafts]);

	const rowKey = useCallback((propertyIndex: number) => new CellKey({ resourceId: detail.id, column: 'line', propertyIndex }), [detail.id]);
	const draftKey = useCallback((draft: StatementDraft) => new CellKey({ resourceId: detail.id, column: 'draft', propertyIndex: draft.id }), [detail.id]);

	const showProblem = (cellKey: CellKey, problem: string | undefined): void => {
		setProblems(current => {
			const { [cellKey.toString()]: _previous, ...rest } = current;

			return problem ? { ...rest, [cellKey.toString()]: problem } : rest;
		});
	};

	const commitProperty = (index: number, property: PropertyView, statement: EditableStatement): void => {
		const cellKey = rowKey(index);
		const predicate = _iriOf(property);

		if (!predicate) {
			return;
		}

		if (statement.isEmpty) {
			editing.submit([{ op: 'deleteProperty', subject, predicate }], cellKey, rowKey(Math.max(0, index - 1)));

			return;
		}

		const problem = service.problemOf(service.canonicalTextOf(statement));

		showProblem(cellKey, problem);

		if (!problem) {
			editing.submit([{ op: 'replaceStatement', subject, predicate, text: service.statementTextOf(statement) }], cellKey);
		}
	};

	const commitDraft = (draft: StatementDraft, statement: EditableStatement): void => {
		const cellKey = draftKey(draft);

		if (statement.isEmpty) {
			return;
		}

		const problem = service.problemOf(service.canonicalTextOf(statement));

		showProblem(cellKey, problem);

		if (!problem) {
			editing.submit([{ op: 'replaceStatement', subject, text: service.statementTextOf(statement) }], cellKey);
			setDrafts(current => current.submitted(draft.id));
		}
	};

	const deleteProperty = (index: number, property: PropertyView): void => {
		const predicate = _iriOf(property);

		if (predicate) {
			editing.submit([{ op: 'deleteProperty', subject, predicate }], rowKey(index), rowKey(Math.max(0, index - 1)));
		}
	};

	const leaveRow = (from: HTMLElement | null, direction: 'previous' | 'next', column: StatementRowColumn): void => {
		_focusNeighbourRow(listRef.current, from, direction, column);
	};

	return (
		<div ref={listRef} className="statement-list is-editable">
			{shown.properties.map((property, index) => {
				const cellKey = rowKey(index);

				return (
					<Fragment key={index}>
						{property.comments && <div className="statement-comment">{property.comments.join('\n')}</div>}
						{service.canEdit(property)
							? (
								<StatementEditor
									cellKey={cellKey}
									initial={service.editableStatementOf(property)}
									terms={service.termViewsOf(property)}
									nestedNodes={property.values.filter(value => value.nested !== undefined)}
									languages={languages}
									service={service}
									dataService={dataService}
									visited={visited}
									error={editing.state.errorForRow(detail.id, index)?.message ?? problems[cellKey.toString()]}
									onDismissError={() => {
										editing.dismissError(cellKey);
										showProblem(cellKey, undefined);
									}}
									onCommit={statement => commitProperty(index, property, statement)}
									onDeleteRow={() => deleteProperty(index, property)}
									onLeaveRow={(direction, column) => leaveRow(_rowElementOf(listRef.current, cellKey), direction, column)}
								/>
							)
							: <StatementRow property={property} dataService={dataService} depth={0} visited={visited} />}
					</Fragment>
				);
			})}
			{drafts.all.map(draft => {
				const cellKey = draftKey(draft);

				return (
					<StatementEditor
						key={`draft-${draft.id}`}
						cellKey={cellKey}
						initial={EditableStatement.EMPTY}
						languages={languages}
						service={service}
						dataService={dataService}
						visited={visited}
						draft
						error={editing.state.errorForCell(cellKey)?.message ?? problems[cellKey.toString()]}
						onDismissError={() => {
							editing.dismissError(cellKey);
							showProblem(cellKey, undefined);
						}}
						onCommit={statement => commitDraft(draft, statement)}
						onDeleteRow={() => undefined}
						onLeaveRow={(direction, column) => leaveRow(_rowElementOf(listRef.current, cellKey), direction, column)}
					/>
				);
			})}
		</div>
	);
}

/**
 * The languages the literals of a resource are tagged with, each once, in the order met.
 * @param detail The resource.
 * @returns The languages.
 */
function _languagesOf(detail: ResourceDetail): string[] {
	const languages: string[] = [];

	for (const property of detail.properties) {
		for (const value of property.values) {
			if (value.term.kind === 'literal' && value.term.language && !languages.includes(value.term.language)) {
				languages.push(value.term.language);
			}
		}
	}

	return languages;
}

/**
 * The IRI of the predicate of a property.
 * @param property The property.
 * @returns The IRI, or `undefined` for a predicate that is no IRI.
 */
function _iriOf(property: PropertyView): string | undefined {
	return property.predicate.term.kind === 'iri' ? property.predicate.term.iri : undefined;
}

/**
 * Find the element of a row by its cell.
 * @param list The list.
 * @param cellKey The cell of the row.
 * @returns The element, or `null` when the row is not drawn.
 */
function _rowElementOf(list: HTMLElement | null, cellKey: CellKey): HTMLElement | null {
	return list?.querySelector<HTMLElement>(`:scope > [data-cell="${cellKey.toString().replace(/["\\]/g, '\\$&')}"]`) ?? null;
}

/**
 * Move the caret to the row above or below: into its predicate, or into its first value, or the
 * field for a new value when it has none. Rows that are only read are passed over.
 * @param list The list.
 * @param from The element of the row the caret leaves.
 * @param direction Which way.
 * @param column Which column the caret moves to.
 */
function _focusNeighbourRow(list: HTMLElement | null, from: HTMLElement | null, direction: 'previous' | 'next', column: StatementRowColumn): void {
	const rows = list ? Array.from(list.querySelectorAll<HTMLElement>(':scope > [data-cell]')) : [];
	const step = direction === 'next' ? 1 : -1;
	const selector = column === 'predicate' ? '[data-field="predicate"]' : '[data-field^="value:"], [data-field="newValue"]';

	for (let index = (from ? rows.indexOf(from) : -1) + step; index >= 0 && index < rows.length; index += step) {
		const field = rows[index].querySelector<HTMLElement>(selector);

		if (field) {
			new InputFieldElement(field).focus(direction === 'next' ? 'start' : 'end');

			return;
		}
	}
}
