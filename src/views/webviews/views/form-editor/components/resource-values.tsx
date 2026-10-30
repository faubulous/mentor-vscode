import { KeyboardEvent, MouseEvent, useMemo, useRef } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { ValueKind } from '@src/utilities/value-kind';
import { ResourceSummary, TermRef, TermView } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { Combobox, ComboboxOption } from './combobox';
import { ValuePill } from './value-pill';

/**
 * A resource value of a row, with its index among the values of the statement.
 */
interface ResourceValueEntry {
	/**
	 * The view of the resource.
	 */
	view: TermView;

	/**
	 * The index of the value among the values of the statement.
	 */
	index: number;
}

/**
 * Properties of the {@link ResourceValues} component.
 */
export interface ResourceValuesProps {
	/**
	 * The resources of the row, in order.
	 */
	resources: readonly ResourceValueEntry[];

	/**
	 * The resources of the document, which the input offers.
	 */
	documentResources: readonly ResourceSummary[];

	/**
	 * What the predicate takes, which decides how typed text is read.
	 */
	range: ValueKind;

	/**
	 * The text typed into the input.
	 */
	pendingText: string;

	/**
	 * Reads typed text and names the resources on offer.
	 */
	services: StatementServices;

	/**
	 * The hint shown in the empty input.
	 */
	placeholder: string;

	/**
	 * Called with the text of the input as it is typed.
	 */
	onPendingInput: (text: string) => void;

	/**
	 * Called with a resource picked from the list.
	 */
	onPick: (term: TermRef) => void;

	/**
	 * Called when Enter takes the typed text.
	 */
	onCreate: () => void;

	/**
	 * Called to remove a value.
	 */
	onRemove: (index: number) => void;
}

/**
 * The resources of a statement in one box: a pill per resource and the input of the next value
 * after the last pill, which offers the resources of the document and takes a typed prefixed name,
 * `<iri>` or, where the predicate takes more than resources, text. The box is one stop of Tab, the
 * input; the arrows walk the pills from it. On a pill Backspace and Delete remove it, and typing
 * continues in the input.
 * @param props The resources and their callbacks.
 * @returns The box.
 */
export function ResourceValues(props: ResourceValuesProps): React.JSX.Element {
	const { resources, documentResources, range, pendingText, services, placeholder, onPendingInput, onPick, onCreate, onRemove } = props;
	const pills = useRef<(HTMLElement | null)[]>([]);
	const fieldRef = useRef<VscodeTextfield>(null);
	const options = useMemo(() => range === 'literal' ? [] : _optionsOf(documentResources, resources, services), [range, documentResources, resources, services]);

	const focusPill = (position: number): void => {
		if (position >= resources.length) {
			fieldRef.current?.focus();
		} else if (position >= 0) {
			pills.current[position]?.focus();
		}
	};

	const handlePillKeyDown = (position: number) => (event: KeyboardEvent<HTMLSpanElement>): void => {
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				focusPill(Math.max(0, position - 1));
				return;
			case 'ArrowRight':
				event.preventDefault();
				focusPill(position + 1);
				return;
			case 'Home':
				event.preventDefault();
				focusPill(0);
				return;
			case 'End':
				event.preventDefault();
				focusPill(resources.length);
				return;
			case 'Backspace':
			case 'Delete':
				event.preventDefault();
				onRemove(resources[position].index);
				focusPill(event.key === 'Backspace' ? position - 1 : position);
				return;
			default:
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
					event.preventDefault();
					onPendingInput(pendingText + event.key);
					fieldRef.current?.focus();
				}
		}
	};

	const handleFieldKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		const input = event.currentTarget.wrappedElement;
		const atStart = input ? input.selectionStart === 0 && input.selectionEnd === 0 : pendingText === '';

		if (resources.length > 0 && atStart && (event.key === 'ArrowLeft' || event.key === 'Backspace')) {
			event.preventDefault();

			if (event.key === 'Backspace') {
				onRemove(resources[resources.length - 1].index);
			} else {
				focusPill(resources.length - 1);
			}
		}
	};

	const focusFieldOnFreeSpace = (event: MouseEvent<HTMLSpanElement>): void => {
		if (event.target === event.currentTarget) {
			event.preventDefault();
			fieldRef.current?.focus();
		}
	};

	return (
		<span className="resource-values" onMouseDown={focusFieldOnFreeSpace}>
			{resources.map(({ view, index }, position) => (
				<span key={index} data-value-index={index}>
					<ValuePill view={view} pillRef={element => { pills.current[position] = element; }} onKeyDown={handlePillKeyDown(position)} onRemove={() => onRemove(index)} />
				</span>
			))}
			<Combobox
				text={pendingText}
				onTextChange={onPendingInput}
				options={options}
				onPick={onPick}
				onCreate={onCreate}
				onKeyDown={handleFieldKeyDown}
				label="New value"
				placeholder={placeholder}
				className="is-new"
				fieldRef={fieldRef}
			/>
		</span>
	);
}

/**
 * The resources of the document the input offers: those not among the values already, by their
 * label, with their prefixed name and IRI under it.
 * @param documentResources The resources of the document.
 * @param resources The resources of the row.
 * @param services Names the resources by their prefixed names.
 * @returns The options.
 */
function _optionsOf(documentResources: readonly ResourceSummary[], resources: readonly ResourceValueEntry[], services: StatementServices): ComboboxOption<TermRef>[] {
	const present = new Set(resources.flatMap(({ view }) => view.term.kind === 'iri' ? [view.term.iri] : []));

	return documentResources.flatMap(resource => {
		if (resource.term.kind !== 'iri' || present.has(resource.term.iri)) {
			return [];
		}

		const prefixedName = resource.prefixedName ?? services.resolver.viewOf(resource.term).prefixedName;

		return [{ label: resource.label, detail: prefixedName ? `${prefixedName}\n${resource.term.iri}` : resource.term.iri, keywords: prefixedName, value: resource.term }];
	});
}
