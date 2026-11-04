import { describe, expect, it } from 'vitest';
import { RDF, RDFS, XSD } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE as EX, createIriView, createLiteralView, createProperty, withAnchors, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { PropertyView, TermView } from '../form-editor-model';
import { StatementDraft } from './statement-draft';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * A property of `rdfs:label` with two literals and a resource, each with an anchor.
 */
function createLabelProperty(): PropertyView {
	return withAnchors(createTestResourceDetail([createProperty('rdfs:label', [createLiteralView('Tree', 'en'), createLiteralView('Baum', 'de'), createIriView('ex:Other')])])).properties[0];
}

describe('StatementDraft', () => {
	it('reads a property as its predicate IRI and its written values', () => {
		const draft = StatementDraft.fromProperty(createLabelProperty());

		expect(draft.predicate).toBe(RDFS.label);
		expect(draft.values.map(value => value.kind)).toEqual(['written', 'written', 'written']);
		expect(draft.toStatementValues()).toEqual([{ kind: 'existing', anchor: 110 }, { kind: 'existing', anchor: 120 }, { kind: 'existing', anchor: 130 }]);
	});

	it('edits only properties whose predicate is written and whose values carry anchors', () => {
		const property = createLabelProperty();

		expect(StatementDraft.canEdit(property)).toBe(true);
		expect(StatementDraft.canEdit({ ...property, values: [createLiteralView('x')] })).toBe(false);
		expect(StatementDraft.canEdit({ ...property, predicate: { ...property.predicate, editable: false } })).toBe(false);
	});

	it('changes the text of a literal, keeping its tag, and restores the written value for its original text', () => {
		const stored = StatementDraft.fromProperty(createLabelProperty());
		const changed = stored.withLiteralText(0, 'Oak');

		expect(changed.values[0]).toMatchObject({ kind: 'term', term: RdfDataFactory.literal('Oak', 'en') });
		expect(changed.hasSameValues(stored)).toBe(false);
		expect(changed.withLiteralText(0, 'Tree').hasSameValues(stored)).toBe(true);
		expect(stored.withLiteralText(2, 'x')).toBe(stored);
		expect(changed.toStatementValues()[0]).toEqual({ kind: 'term', term: RdfDataFactory.literal('Oak', 'en') });
	});

	it('gives a literal another tag, keeping its text, and restores the written value for its original tag', () => {
		const stored = StatementDraft.fromProperty(createLabelProperty());
		const german = stored.withLiteralTag(0, { language: 'de' });
		const typed = stored.withLiteralTag(0, { datatype: XSD.string });

		expect(german.values[0]).toMatchObject({ kind: 'term', term: RdfDataFactory.literal('Tree', 'de') });
		expect(german.withLiteralTag(0, { language: 'en' }).hasSameValues(stored)).toBe(true);
		expect(typed.values[0]).toMatchObject({ kind: 'term', term: RdfDataFactory.literal('Tree', RdfDataFactory.namedNode(XSD.string)) });
		expect(stored.withLiteralTag(2, { language: 'de' })).toBe(stored);
	});

	it('adds and removes values and takes a predicate', () => {
		const draft = StatementDraft.EMPTY.withPredicate(RDFS.comment).withValueAppended(RdfDataFactory.literal('x'));

		expect(StatementDraft.EMPTY.isComplete).toBe(false);
		expect(draft.isComplete).toBe(true);
		expect(draft.withoutValue(0).isComplete).toBe(false);
	});

	it('compares values as terms, whatever object holds them', () => {
		const draft = new StatementDraft(RDFS.label, [{ kind: 'term', term: RdfDataFactory.literal('Oak', 'en') }]);
		const revived = new StatementDraft(RDFS.label, [{ kind: 'term', term: RdfDataFactory.fromTerm(RdfDataFactory.literal('Oak', 'en')) }]);
		const other = new StatementDraft(RDFS.label, [{ kind: 'term', term: RdfDataFactory.literal('Oak', 'de') }]);

		expect(draft.hasSameValues(revived)).toBe(true);
		expect(draft.hasSameValues(other)).toBe(false);
	});

	it('carries a draft over to the statement as written after an edit, by term and by the place of blank nodes', () => {
		const node: TermView = { term: RdfDataFactory.blankNode('n1'), editable: true, anchor: 1, nested: { term: RdfDataFactory.blankNode('n1'), propertyCount: 1 } };
		const before = new StatementDraft(RDFS.label, [{ kind: 'written', view: node }, { kind: 'term', term: RdfDataFactory.literal('Oak', 'en') }, { kind: 'term', term: RdfDataFactory.literal('1', RdfDataFactory.namedNode(XSD.integer)) }]);
		const after = withAnchors(createTestResourceDetail([createProperty('rdfs:label', [
			{ term: RdfDataFactory.blankNode('n7'), editable: true, nested: { term: RdfDataFactory.blankNode('n7'), propertyCount: 1 } },
			createLiteralView('Oak', 'en')
		])])).properties[0];
		const rebased = before.rebasedOnto(StatementDraft.fromProperty(after));

		expect(rebased.values.map(value => value.kind)).toEqual(['written', 'written', 'term']);
		expect(rebased.toStatementValues()).toEqual([{ kind: 'existing', anchor: 110 }, { kind: 'existing', anchor: 120 }, { kind: 'term', term: RdfDataFactory.literal('1', RdfDataFactory.namedNode(XSD.integer)) }]);
		expect(rebased.hasSameValues(StatementDraft.fromProperty(after))).toBe(false);
	});

	it('neither writes nor compares a new blank node until its type is chosen, and writes it with its type', () => {
		const stored = StatementDraft.fromProperty(createLabelProperty());
		const draft = stored.withNodeAppended();
		const type = RdfDataFactory.namedNode(`${EX}Leaf`);

		expect(draft.hasSameValues(stored)).toBe(true);
		expect(new StatementDraft(RDFS.label, []).withNodeAppended().isComplete).toBe(false);
		expect(draft.toStatementValues()).toEqual(stored.toStatementValues());
		expect(draft.withoutUntypedNodes().values).toHaveLength(3);

		const typed = draft.withNodeType(3, type);

		expect(typed.hasSameValues(stored)).toBe(false);
		expect(typed.toStatementValues()[3]).toEqual({ kind: 'node', statements: [{ predicate: RDF.type, values: [{ kind: 'term', term: type }] }] });
		expect(typed.withoutUntypedNodes()).toBe(typed);
		expect(typed.withNodeType(0, type)).toBe(typed);
	});

	it('keeps a new blank node as it is when carried over, until an edit writing it was sent, and then finds it among the blank nodes', () => {
		const node: TermView = { term: RdfDataFactory.blankNode('b0'), editable: true, anchor: 140 };
		const typed = new StatementDraft(RDFS.label, []).withNodeAppended().withNodeType(0, RdfDataFactory.namedNode(`${EX}Leaf`));
		const written = new StatementDraft(RDFS.label, [{ kind: 'written', view: node }]);

		expect(typed.rebasedOnto(written).values[0]).toBe(typed.values[0]);
		expect(typed.withNodesSent(true).rebasedOnto(written).values[0]).toEqual({ kind: 'written', view: node });
		expect(typed.withNodesSent(true).rebasedOnto(new StatementDraft(RDFS.label, [])).values[0]).toMatchObject({ kind: 'term', node: { sent: false } });
	});
});
