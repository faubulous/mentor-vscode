import { useId } from 'react';
import { useTagPicker } from '../hooks/use-tag-picker';
import { NewValueType } from '../state/new-value-type';
import { LiteralTagData } from './datatype-labels';
import { TagButton } from './tag-button';
import { TagPicker } from './tag-picker';
import { TagSelection } from './tag-picker-items';

/**
 * The tag the input of a new value shows for each type of value it makes.
 */
const TYPE_TAGS: Readonly<Record<NewValueType, LiteralTagData>> = {
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
	 * The languages of the card, which the tag picker offers first.
	 */
	languages: readonly string[];

	/**
	 * Called with what the item picked gives the typed text.
	 */
	onPick: (selection: TagSelection) => void;

	/**
	 * Called when the tag picker is done with, so the input takes the focus back.
	 */
	onDone: () => void;
}

/**
 * The type of value the input of a new value makes, shown after its text: `resource` or `string`.
 * It opens the tag picker with resource first, which keeps the text a resource, while a datatype
 * or a language makes a literal of it.
 * @param props The type and what to do with a pick.
 * @returns The marker.
 */
export function NewValueTypeMarker({ type, languages, onPick, onDone }: NewValueTypeMarkerProps): React.JSX.Element {
	const listId = useId();
	const picker = useTagPicker({ current: type === 'resource' ? 'resource' : {}, languages, resourceItemPosition: 'first', onPick, onDone });

	const toggle = (): void => {
		if (picker.open) {
			onDone();
		}

		picker.toggle();
	};

	return (
		<>
			<TagButton key={type} tag={TYPE_TAGS[type]} guarded onAct={toggle} />
			{picker.open && <TagPicker picker={picker} listId={listId} />}
		</>
	);
}
