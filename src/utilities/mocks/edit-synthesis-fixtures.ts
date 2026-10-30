import { _RDFS, _XSD } from '@faubulous/mentor-rdf';
import { QuadContext, RdfSyntax, TurtleReader, assignBlankNodeIds } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { EditOperation } from '@src/services/editing/edit-operation';
import { EditPlan } from '@src/services/editing/edit-plan';
import { isEditRejection } from '@src/services/editing/edit-rejection';
import { EditSynthesizer } from '@src/services/editing/edit-synthesizer';
import { EditVerifier } from '@src/services/editing/edit-verifier';
import { StyleFallback } from '@src/services/editing/local-style';
import { SynthesisInput } from '@src/services/editing/synthesis-context';
import { applyTextEdits } from '@src/utilities/text-edits';

/**
 * The namespace of the example resources of the synthesis tests.
 */
export const EX = 'http://example.org/';

/**
 * The prefix declarations a Turtle or TriG test document starts with.
 */
export const PREAMBLE = `@prefix ex: <${EX}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix xsd: <${_XSD}> .\n\n`;

/**
 * How a test document is written.
 */
export interface SynthesisFixtureOptions {
	/**
	 * The syntax of the document; Turtle when omitted.
	 */
	syntax?: RdfSyntax;

	/**
	 * The editor settings the style falls back to.
	 */
	style?: Partial<StyleFallback>;
}

/**
 * Indicate whether a syntax declares prefixes, which the test documents of that syntax start with.
 * @param syntax The syntax.
 * @returns `true` for Turtle and TriG.
 */
function _hasPrefixes(syntax: RdfSyntax): boolean {
	return syntax === RdfSyntax.Turtle || syntax === RdfSyntax.TriG;
}

/**
 * Read the tokens and statements of a text the way the document context does: blank nodes get
 * their identifiers from the tokens, and the reader of the syntax relates statements to tokens.
 * @param text The text.
 * @param syntax The syntax of the text.
 * @returns The tokens and quad contexts.
 */
function _read(text: string, syntax: RdfSyntax): Pick<SynthesisInput, 'tokens' | 'quadContexts'> {
	const lexer = ParserFactory.getLexer(syntax);

	lexer.blankNodeIdGenerator = undefined;

	const tokens = assignBlankNodeIds(lexer.tokenize(text).tokens);
	const cst = ParserFactory.getParser(syntax).parse(tokens);
	const reader = ParserFactory.createReader(syntax);
	const quadContexts = reader instanceof TurtleReader
		? reader.readQuadContexts(cst, tokens)
		: (reader as unknown as { readQuadContexts(cst: unknown): QuadContext[] }).readQuadContexts(cst);

	return { tokens, quadContexts };
}

/**
 * Build the synthesis input of a test document: a Turtle or TriG body after the prefix
 * declarations of {@link PREAMBLE}, an N-Triples or N-Quads body as it is.
 * @param body The statements of the document.
 * @param options How the document is written.
 * @returns The input.
 */
export function createSynthesisInput(body: string, options: SynthesisFixtureOptions = {}): SynthesisInput {
	const syntax = options.syntax ?? RdfSyntax.Turtle;
	const text = _hasPrefixes(syntax) ? PREAMBLE + body : body;

	return {
		text,
		..._read(text, syntax),
		namespaces: _hasPrefixes(syntax) ? { ex: EX, rdfs: _RDFS, xsd: _XSD } : {},
		syntax,
		style: { tabSize: 4, insertSpaces: true, ...options.style }
	};
}

/**
 * Synthesize and verify operations on a test document.
 * @param body The statements of the document.
 * @param operations The operations.
 * @param options How the document is written.
 * @returns The edited body, or `rejected:<reason>` or `unverified:<message>`.
 */
export function synthesizeEdit(body: string, operations: EditOperation[], options: SynthesisFixtureOptions = {}): string {
	const input = createSynthesisInput(body, options);
	const plan = new EditSynthesizer(input).synthesize(operations);

	if (isEditRejection(plan)) {
		return `rejected:${plan.reason}`;
	}

	const verification = new EditVerifier(input).verify(plan);

	if (!verification.ok) {
		return `unverified:${verification.message}`;
	}

	return applyTextEdits(input.text, plan.edits).slice(input.text.length - body.length);
}

/**
 * Synthesize operations on a test document, for tests of the plan itself.
 * @param body The statements of the document.
 * @param operations The operations.
 * @param options How the document is written.
 * @returns The plan.
 * @throws {Error} If the operations are rejected.
 */
export function synthesizePlan(body: string, operations: EditOperation[], options: SynthesisFixtureOptions = {}): EditPlan {
	const plan = new EditSynthesizer(createSynthesisInput(body, options)).synthesize(operations);

	if (isEditRejection(plan)) {
		throw new Error(`Rejected: ${plan.reason}`);
	}

	return plan;
}

/**
 * The offset a text starts at in the body of a test document, as the snapshot reports the anchor
 * of a value written there.
 * @param body The statements of the document.
 * @param needle The text to find.
 * @param options How the document is written.
 * @param occurrence Which occurrence of the text, from one.
 * @returns The offset in the whole document.
 * @throws {Error} If the text does not occur so often.
 */
export function anchorOf(body: string, needle: string, options: SynthesisFixtureOptions = {}, occurrence = 1): number {
	const preamble = _hasPrefixes(options.syntax ?? RdfSyntax.Turtle) ? PREAMBLE.length : 0;
	let index = -1;

	for (let count = 0; count < occurrence; count++) {
		index = body.indexOf(needle, index + 1);

		if (index < 0) {
			throw new Error(`'${needle}' does not occur ${occurrence} times.`);
		}
	}

	return preamble + index;
}
