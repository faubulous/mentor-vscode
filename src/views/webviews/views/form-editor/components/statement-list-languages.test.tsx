// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, within } from '@testing-library/react';
import { RDFS } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { TEST_NAMESPACES, TEST_SUBJECT, createLiteralView, createProperty, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview, typeInto } from '@src/utilities/mocks/webview-test-utils';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceCardBodyData } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { LanguageFilter } from '../state/language-filter';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

/**
 * A label in English and German, and a comment without a language; the values are anchored from
 * 110 on, in this order.
 */
const CARD_BODY = withAnchors(createTestCardBody([
	createProperty('rdfs:label', [createLiteralView('Tree', 'en'), createLiteralView('Baum', 'de')]),
	createProperty('rdfs:comment', [createLiteralView('A plant')])
]));

/**
 * Render the statements about a resource, edited, with the literals of one language shown.
 * @param language The language shown; every language when `undefined`.
 * @param cardBody The statements.
 */
function renderList(language: string | undefined, cardBody: ResourceCardBodyData = CARD_BODY) {
	const host = createEditingHostStub();
	const editing = new EditingController(host);
	const dataService = createResourceDataServiceStub([cardBody]);
	const context: FormEditorContextValue = { readOnly: false, editing, namespaces: NAMESPACES, languageTags: { en: 'en', de: 'de' }, languageFilter: new LanguageFilter(language), resources: [] };

	renderWebview(
		<FormEditorContext.Provider value={context}>
			<StatementList cardBody={cardBody} stale={false} dataService={dataService} depth={0} visited={[cardBody.subject]} />
		</FormEditorContext.Provider>
	);

	return { host };
}

/**
 * The row of a predicate.
 */
function rowOf(label: string): HTMLElement {
	return document.querySelector<HTMLElement>(`.statement-line[aria-label="${label}"]`)!;
}

/**
 * The texts of the literal fields of a row, with their tags.
 */
function literalsOf(row: HTMLElement): string[] {
	return Array.from(row.querySelectorAll<HTMLElement>('.literal-field')).map(field => {
		const input = field.querySelector('textarea')!;

		return `${input.value}@${field.querySelector('.literal-field-tag')?.textContent ?? ''}`;
	});
}

/**
 * Move the focus out of a row, as tabbing away from it does.
 */
async function leave(row: HTMLElement): Promise<void> {
	await act(async () => {
		fireEvent.focusOut(row.querySelector('vscode-textfield')!, { relatedTarget: null });
	});
}

describe('StatementList, in one language', () => {
	it('shows the literals of the language and those without one, and every literal for all languages', () => {
		renderList('de');

		expect(literalsOf(rowOf('rdfs:label'))).toEqual(['Baum@de']);
		expect(literalsOf(rowOf('rdfs:comment'))).toEqual(['A plant@']);
	});

	it('shows every literal for all languages', () => {
		renderList(undefined);

		expect(literalsOf(rowOf('rdfs:label'))).toEqual(['Tree@en', 'Baum@de']);
	});

	it('writes the values of the other languages along when a value is edited', async () => {
		const { host } = renderList('de');
		const row = rowOf('rdfs:label');

		typeInto(within(row).getByLabelText('Value 2'), 'Eiche');
		await leave(row);

		expect(host.submitted[0].operations).toEqual([{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.label,
			values: [{ kind: 'existing', anchor: 110 }, { kind: 'term', term: RdfDataFactory.literal('Eiche', 'de') }]
		}]);
	});

	it('offers an empty field for a language the row lacks, which keeps its element as it turns into the value', async () => {
		const { host } = renderList('fr');
		const row = rowOf('rdfs:label');
		const field = within(row).getByLabelText('Value 3');

		expect(literalsOf(row)).toEqual(['@fr']);
		expect(literalsOf(rowOf('rdfs:comment'))).toEqual(['A plant@']);

		typeInto(field, 'Arbre');

		expect(within(row).getByLabelText('Value 3')).toBe(field);

		await leave(row);

		expect(host.submitted[0].operations).toEqual([{
			op: 'setValues',
			subject: TEST_SUBJECT,
			predicate: RDFS.label,
			values: [{ kind: 'existing', anchor: 110 }, { kind: 'existing', anchor: 120 }, { kind: 'term', term: RdfDataFactory.literal('Arbre', 'fr') }]
		}]);
	});

	it('gives the empty field back when the value typed into it is emptied, and writes nothing', async () => {
		const { host } = renderList('fr');
		const row = rowOf('rdfs:label');
		const field = within(row).getByLabelText('Value 3');

		typeInto(field, 'Arbre');
		typeInto(field, '');

		expect(within(row).getByLabelText('Value 3')).toBe(field);
		expect(literalsOf(row)).toEqual(['@fr']);

		await leave(row);

		expect(host.submitted).toEqual([]);
	});
});
