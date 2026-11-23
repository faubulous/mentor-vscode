import { useId } from 'react';
import { useLiteralAnnotationPicker } from '../hooks/use-literal-annotation-picker';
import { NewValueType } from '../state/new-value-type';
import { LiteralAnnotationData } from './datatype-labels';
import { LiteralAnnotationButton } from './literal-annotation-button';
import { LiteralAnnotationPicker } from './literal-annotation-picker';
import { LiteralAnnotationPickerSelection } from './literal-annotation-picker-items';

/**
 * The annotation the input of a new value shows for each type of value it makes.
 */
const TYPE_ANNOTATIONS: Readonly<Record<NewValueType, LiteralAnnotationData>> = {
	resource: { text: 'resource', tooltip: 'Adds a resource; choose a datatype or language to add text', accessibleName: 'New value resource, change' },
	literal: { text: 'string', tooltip: 'Adds text; choose a datatype, a language or a resource', accessibleName: 'New value string, change' }
};

/**
 * Properties of the {@link NewValueTypeMarker} component.
 */
export interface NewValueTypeMarkerProps {
	/**
	 * The type of value the typed text makes.
	 */
	type: NewValueType;

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
 * The type of value the input of a new value makes, shown after its text: `resource` or `string`.
 * It opens the annotation picker with resource first, which keeps the text a resource, while a datatype
 * or a language makes a literal of it.
 * @param props The type and what to do with a pick.
 * @returns The marker.
 */
export function NewValueTypeMarker({ type, languages, onPick, onDone }: NewValueTypeMarkerProps): React.JSX.Element {
	const listId = useId();
	const picker = useLiteralAnnotationPicker({ current: type === 'resource' ? 'resource' : {}, languages, resourceItemPosition: 'first', onPick, onDone });

	const toggle = (): void => {
		if (picker.open) {
			onDone();
		}

		picker.toggle();
	};

	return (
		<>
			<LiteralAnnotationButton key={type} annotation={TYPE_ANNOTATIONS[type]} guarded onAct={toggle} />
			{picker.open && <LiteralAnnotationPicker picker={picker} listId={listId} />}
		</>
	);
}
