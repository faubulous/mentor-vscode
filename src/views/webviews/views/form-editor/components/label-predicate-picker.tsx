import { useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { StatementServices } from '../hooks/use-statement-services';
import { useFormEditorContext } from '../state/form-editor-context';
import { StatementRowEditor } from '../state/statement-row-editor';

/**
 * Properties of the {@link LabelPredicatePicker} component.
 */
export interface LabelPredicatePickerProps {
	/**
	 * Edits the label row.
	 */
	editor: StatementRowEditor;

	/**
	 * The IRI of the predicate the label is written with, if it has one.
	 */
	predicate?: string;

	/**
	 * Names the predicates.
	 */
	services: StatementServices;
}

/**
 * The predicate of the label row of a card: "label", which opens a menu of the label predicates
 * Mentor is configured with, the current one marked. Picking another writes the label with it.
 * The menu hides itself when an item is picked or the user clicks away, so its visibility is left
 * to the element.
 * @param props The row and its predicate.
 * @returns The picker.
 */
export function LabelPredicatePicker({ editor, predicate, services }: LabelPredicatePickerProps): React.JSX.Element {
	const { labelPredicates = [] } = useFormEditorContext();
	const menuRef = useRef<VscodeContextMenu | null>(null);
	const selectRef = useVscodeElementRef<VscodeContextMenu, { value: string }>('vsc-context-menu-select', (_element, event) => {
		if (event.detail.value !== predicate) {
			editor.inputPredicate(_textOf(event.detail.value, services));
			editor.commitPredicate();
		}
	});
	const current = labelPredicates.find(term => term.value === predicate);

	const setMenuRef = (element: VscodeContextMenu | null): void => {
		menuRef.current = element;
		selectRef(element);
	};

	const toggle = (): void => {
		if (menuRef.current) {
			menuRef.current.show = !menuRef.current.show;
		}
	};

	return (
		<span className="label-predicate-picker">
			<button type="button" className="label-predicate-button" aria-haspopup="menu" aria-label="Label predicate" title={current ? _textOf(current.value, services) : predicate} onClick={toggle}>
				label
			</button>
			<vscode-context-menu
				ref={setMenuRef}
				data={labelPredicates.map(term => ({
					label: _textOf(term.value, services),
					keybinding: term.value === predicate ? 'current' : '',
					value: term.value
				}))}
			></vscode-context-menu>
		</span>
	);
}

/**
 * How a predicate is written: its prefixed name, else its IRI in angle brackets.
 * @param iri The IRI of the predicate.
 * @param services Gives the predicate its prefixed name.
 * @returns The text.
 */
function _textOf(iri: string, services: StatementServices): string {
	return services.resolver.viewOf(RdfDataFactory.namedNode(iri)).prefixedName ?? `<${iri}>`;
}
