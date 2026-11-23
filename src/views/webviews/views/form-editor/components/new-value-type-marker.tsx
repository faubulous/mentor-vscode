import { useId } from 'react';
import { useLiteralAnnotationPicker } from '../hooks/use-literal-annotation-picker';
import { LiteralAnnotationData } from './datatype-labels';
import { LiteralAnnotationButton } from './literal-annotation-button';
import { LiteralAnnotationPicker } from './literal-annotation-picker';
import { LiteralAnnotationPickerSelection } from './literal-annotation-picker-items';

/**
 * The annotation the input of a new value shows after the text it keeps, which is a resource: text
 * for a literal moves into a literal of its own.
 */
const RESOURCE_ANNOTATION: LiteralAnnotationData = { text: 'resource', tooltip: 'Adds a resource; choose a datatype or language to add text', accessibleName: 'New value resource, change' };

/**
 * Properties of the {@link NewValueTypeMarker} component.
 */
export interface NewValueTypeMarkerProps {
	/**
	 * The languages of the card, which the annotation picker offers first.
	 */
	languages: readonly string[];

	/**
	 * Called with what the item picked gives the typed text.
	 */
	onPick: (selection: LiteralAnnotationPickerSelection) => void;

	/**
	 * Called when the annotation picker is done with, so the input takes the focus back.
	 */
	onDone: () => void;
}

/**
 * The type of value the input of a new value makes of the text it keeps, shown after its text:
 * `resource`. It opens the annotation picker with resource first, which keeps the text a resource,
 * while a datatype or a language makes a literal of it.
 * @param props The languages of the card and what to do with a pick.
 * @returns The marker.
 */
export function NewValueTypeMarker({ languages, onPick, onDone }: NewValueTypeMarkerProps): React.JSX.Element {
	const listId = useId();
	const picker = useLiteralAnnotationPicker({ current: 'resource', languages, resourceItemPosition: 'first', onPick, onDone });

	const toggle = (): void => {
		if (picker.open) {
			onDone();
		}

		picker.toggle();
	};

	return (
		<>
			<LiteralAnnotationButton annotation={RESOURCE_ANNOTATION} guarded onAct={toggle} />
			{picker.open && <LiteralAnnotationPicker picker={picker} listId={listId} />}
		</>
	);
}
