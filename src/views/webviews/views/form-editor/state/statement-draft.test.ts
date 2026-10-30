import { describe, expect, it } from 'vitest';
import { RDFS, XSD } from '@faubulous/mentor-rdf';
import { createIriView, createLiteralView, createProperty, withAnchors, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { PropertyView, TermView } from '../form-editor-model';
import { StatementDraft } from './statement-draft';

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

		expect(changed.values[0]).toMatchObject({ kind: 'term', term: { kind: 'literal', value: 'Oak', language: 'en' } });
		expect(changed.hasSameValues(stored)).toBe(false);
		expect(changed.withLiteralText(0, 'Tree').hasSameValues(stored)).toBe(true);
		expect(stored.withLiteralText(2, 'x')).toBe(stored);
		expect(changed.toStatementValues()[0]).toEqual({ kind: 'term', term: { kind: 'literal', value: 'Oak', language: 'en' } });
	});

	it('gives a literal another tag, keeping its text, and restores the written value for its original tag', () => {
		const stored = StatementDraft.fromProperty(createLabelProperty());
		const german = stored.withLiteralTag(0, { language: 'de' });
		const typed = stored.withLiteralTag(0, { datatype: XSD.string });

		expect(german.values[0]).toMatchObject({ kind: 'term', term: { kind: 'literal', value: 'Tree', language: 'de' } });
		expect(german.withLiteralTag(0, { language: 'en' }).hasSameValues(stored)).toBe(true);
		expect(typed.values[0]).toMatchObject({ kind: 'term', term: { kind: 'literal', value: 'Tree', datatype: XSD.string } });
		expect(stored.withLiteralTag(2, { language: 'de' })).toBe(stored);
	});

	it('adds and removes values and takes a predicate', () => {
		const draft = StatementDraft.EMPTY.withPredicate(RDFS.comment).withValueAppended({ kind: 'literal', value: 'x' });

		expect(StatementDraft.EMPTY.isComplete).toBe(false);
		expect(draft.isComplete).toBe(true);
		expect(draft.withoutValue(0).isComplete).toBe(false);
	});

	it('carries a draft over to the statement as written after an edit, by term and by the place of blank nodes', () => {
		const node: TermView = { term: { kind: 'bnode', id: 'n1' }, editable: true, anchor: 1, nested: { id: 'b:n1', propertyCount: 1 } };
		const before = new StatementDraft(RDFS.label, [{ kind: 'written', view: node }, { kind: 'term', term: { kind: 'literal', value: 'Oak', language: 'en' } }, { kind: 'term', term: { kind: 'literal', value: '1', datatype: XSD.integer } }]);
		const after = withAnchors(createTestResourceDetail([createProperty('rdfs:label', [
			{ term: { kind: 'bnode', id: 'n7' }, editable: true, nested: { id: 'b:n7', propertyCount: 1 } },
			createLiteralView('Oak', 'en')
		])])).properties[0];
		const rebased = before.rebasedOnto(StatementDraft.fromProperty(after));

		expect(rebased.values.map(value => value.kind)).toEqual(['written', 'written', 'term']);
		expect(rebased.toStatementValues()).toEqual([{ kind: 'existing', anchor: 110 }, { kind: 'existing', anchor: 120 }, { kind: 'term', term: { kind: 'literal', value: '1', datatype: XSD.integer } }]);
		expect(rebased.hasSameValues(StatementDraft.fromProperty(after))).toBe(false);
	});
});
