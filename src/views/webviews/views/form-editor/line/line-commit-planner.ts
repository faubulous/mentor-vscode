import { EditOperation } from '@src/services/editing/edit-operation';
import { PropertyView, ResourceDetail, TermRef } from '../form-editor-model';
import { LineCanonicalizer } from './line-canonicalizer';
import { LineCommitPlan } from './line-commit-plan';
import { LineLexer } from './line-lexer';
import { LineParser } from './line-parser';
import { LineSerializer } from './line-serializer';
import { LineVocabulary } from './line-vocabulary';
import { isLineProblem } from './parsed-line';
import { StatementRow } from './statement-row';

/**
 * What a commit is decided from.
 */
export interface LineCommitInput {
	/**
	 * The committed text: canonical for a statement, empty for nothing.
	 */
	text: string;

	/**
	 * The row the text was committed on.
	 */
	row: StatementRow;

	/**
	 * The resource of the card.
	 */
	detail: ResourceDetail;

	/**
	 * The subject the statements are about.
	 */
	subject: TermRef;
}

/**
 * Decides what a committed line does to the document: a changed statement is rewritten, an
 * emptied one removed, an emptied draft closed, and a draft becomes a new statement.
 */
export class LineCommitPlanner {
	private readonly _parser: LineParser;

	private readonly _canonicalizer: LineCanonicalizer;

	private readonly _serializer: LineSerializer;

	/**
	 * Create a planner.
	 * @param vocabulary The terms of the card.
	 */
	constructor(vocabulary: LineVocabulary) {
		this._parser = new LineParser(vocabulary.namespaces);
		this._canonicalizer = new LineCanonicalizer(vocabulary);
		this._serializer = new LineSerializer(vocabulary.namespaces);
	}

	/**
	 * Plan a commit.
	 * @param input The committed text and its row.
	 * @returns The plan.
	 */
	plan(input: LineCommitInput): LineCommitPlan {
		const { text, row } = input;

		if (text.trim() === '') {
			return this._planEmptied(input);
		}

		if (text === row.line.text) {
			return { kind: 'none' };
		}

		if (LineLexer.isComment(text)) {
			return { kind: 'problem', text, message: 'Comments are edited in the text editor' };
		}

		return this._planStatement(input);
	}

	/**
	 * An emptied line: a draft goes away, a statement is removed unless it is the only one of the
	 * card.
	 * @param input The committed text and its row.
	 * @returns The plan.
	 */
	private _planEmptied({ text, row, detail, subject }: LineCommitInput): LineCommitPlan {
		if (row.source === 'draft') {
			return { kind: 'discard' };
		}

		const predicate = _predicateIriOf(row, detail);

		if (!predicate || detail.properties.length <= 1) {
			return { kind: 'keep', text };
		}

		return { kind: 'edit', operations: [{ op: 'deleteProperty', subject, predicate }], text, predicate, newNestedNode: false };
	}

	/**
	 * A statement line: parsed, its marker for a new nested node set aside, and written over the
	 * property it came from or as a new one.
	 * @param input The committed text and its row.
	 * @returns The plan.
	 */
	private _planStatement(input: LineCommitInput): LineCommitPlan {
		const { row, detail, subject } = input;
		const parsed = this._parser.parse(input.text);

		if (isLineProblem(parsed)) {
			return { kind: 'problem', text: input.text, message: parsed.message };
		}

		const newNestedNode = this._canonicalizer.countNestedNodeMarkers(input.text) > 0;
		const text = newNestedNode ? this._canonicalizer.removeNestedNodeMarkers(input.text) : input.text;

		if (!this._canonicalizer.hasValues(text)) {
			return this._planWithoutValues(input, text, newNestedNode, parsed.predicate);
		}

		if (newNestedNode && text === row.line.text) {
			return { kind: 'edit', operations: [], text: input.text, predicate: parsed.predicate, newNestedNode };
		}

		const predicate = row.source === 'property' ? _predicateIriOf(row, detail) : undefined;
		const statement = this._serializer.toStatementText(text, row.line.model?.nestedNodes.length ?? 0);
		const operation: EditOperation = predicate
			? { op: 'replaceStatement', subject, predicate, text: statement }
			: { op: 'replaceStatement', subject, text: statement };

		return { kind: 'edit', operations: [operation], text: input.text, predicate: parsed.predicate, newNestedNode };
	}

	/**
	 * A line with a predicate but no values: with a new nested node the node is added first;
	 * otherwise a statement is treated as emptied and a draft keeps the predicate.
	 * @param input The committed text and its row.
	 * @param text The text without the marker.
	 * @param newNestedNode Whether a marker was typed.
	 * @param predicate The predicate IRI.
	 * @returns The plan.
	 */
	private _planWithoutValues(input: LineCommitInput, text: string, newNestedNode: boolean, predicate: string): LineCommitPlan {
		if (newNestedNode) {
			return { kind: 'edit', operations: [], text: input.text, predicate, newNestedNode };
		}

		return input.row.source === 'property' ? this._planEmptied({ ...input, text }) : { kind: 'keep', text };
	}
}

/**
 * The IRI of the predicate of the property a row belongs to.
 * @param row The row.
 * @param detail The resource.
 * @returns The IRI, or `undefined` for a draft or a predicate that is no IRI.
 */
function _predicateIriOf(row: StatementRow, detail: ResourceDetail): string | undefined {
	const property: PropertyView | undefined = row.line.propertyIndex === undefined ? undefined : detail.properties[row.line.propertyIndex];

	return property?.predicate.term.kind === 'iri' ? property.predicate.term.iri : undefined;
}
