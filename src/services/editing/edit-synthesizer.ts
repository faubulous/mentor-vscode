import { RdfToken, getBlankNodeIdFromToken } from '@faubulous/mentor-rdf-parsers';
import { findOverlappingEdits } from '@src/utilities/text-edits';
import { EditOperation } from './edit-operation';
import { EditPlan, mergePlans } from './edit-plan';
import { EditRejection, EditRejectionError } from './edit-rejection';
import { LocalStyleDetector } from './local-style-detector';
import { NamespaceOperations } from './operations/namespace-operations';
import { PropertyOperations } from './operations/property-operations';
import { StatementOperations } from './operations/statement-operations';
import { SubjectOperations } from './operations/subject-operations';
import { StatementModelBuilder } from './statement-model-builder';
import { SynthesisContext, SynthesisInput } from './synthesis-context';
import { TermWriter } from './term-writer';

/**
 * Turns the operations of one user action into the text edits that carry them out. The edits
 * are computed on plain strings; applying them to the document, and verifying them first, is
 * left to the caller.
 */
export class EditSynthesizer {
	/**
	 * Create a synthesizer for a document.
	 * @param _input The document the operations refer to.
	 */
	constructor(private readonly _input: SynthesisInput) { }

	/**
	 * Synthesize the operations of one user action.
	 * @param operations The operations to carry out together.
	 * @returns The plan, or the reason the operations cannot be applied.
	 */
	synthesize(operations: EditOperation[]): EditPlan | EditRejection {
		try {
			const context = this.createContext(operations);
			const plan = mergePlans(operations.map(operation => this._synthesizeOperation(context, operation)));

			if (findOverlappingEdits(plan.edits)) {
				throw new EditRejectionError('ambiguous', 'The operations change overlapping parts of the document.');
			}

			return plan;
		} catch (error) {
			if (error instanceof EditRejectionError) {
				return error.toRejection();
			}

			throw error;
		}
	}

	/**
	 * Build the shared state of one user action. Namespaces declared by the action itself are
	 * known to the writer, so a value can be written with a prefix declared in the same step.
	 * @param operations The operations of the action.
	 * @returns The shared state.
	 */
	createContext(operations: EditOperation[]): SynthesisContext {
		const input = this._input;
		const model = new StatementModelBuilder(input.text, input.tokens, input.quadContexts).build();
		const styleDetector = new LocalStyleDetector(model, input.style);
		const style = styleDetector.style;
		const namespaces = { ...input.namespaces };

		for (const operation of operations) {
			if (operation.op === 'addNamespace') {
				namespaces[operation.prefix] = operation.iri;
			}
		}

		const writer = new TermWriter({
			namespaces,
			syntax: input.syntax,
			useTypeKeyword: style.useTypeKeyword,
			blankNodeLabels: this._collectBlankNodeLabels()
		});

		return { input, model, style, styleDetector, writer, namespaces };
	}

	/**
	 * Synthesize one operation.
	 * @param context The shared state of the action.
	 * @param operation The operation to synthesize.
	 * @returns The plan of the operation.
	 * @throws {EditRejectionError} If the operation cannot be carried out.
	 */
	private _synthesizeOperation(context: SynthesisContext, operation: EditOperation): EditPlan {
		switch (operation.op) {
			case 'replaceStatement':
				return new StatementOperations(context).replaceStatement(operation);
			case 'deleteProperty':
				return new PropertyOperations(context).deleteProperty(operation);
			case 'moveProperty':
				return new PropertyOperations(context).moveProperty(operation);
			case 'addSubject':
				return new SubjectOperations(context).addSubject(operation);
			case 'deleteSubject':
				return new SubjectOperations(context).deleteSubject(operation);
			case 'renameSubject':
				return new SubjectOperations(context).renameSubject(operation);
			case 'addNestedNode':
				return new SubjectOperations(context).addNestedNode(operation);
			case 'addNamespace':
				return new NamespaceOperations(context).addNamespace(operation);
			default:
				throw new EditRejectionError('unsupportedConstruct', `The operation '${(operation as { op: string }).op}' is not supported.`);
		}
	}

	/**
	 * Map the identifiers of labelled blank nodes to the labels written in the document.
	 * @returns The labels by blank node identifier.
	 */
	private _collectBlankNodeLabels(): Map<string, string> {
		const labels = new Map<string, string>();

		for (const token of this._input.tokens) {
			if (token.tokenType?.name === RdfToken.BLANK_NODE_LABEL.name) {
				labels.set(getBlankNodeIdFromToken(token) ?? token.image.substring(2), token.image);
			}
		}

		return labels;
	}
}
