import { useId } from 'react';
import { useTagPicker } from '../hooks/use-tag-picker';
import { NewValueKind } from '../state/new-value-kind';
import { LiteralTagData } from './datatype-labels';
import { TagButton } from './tag-button';
import { TagPicker } from './tag-picker';
import { TagChoice } from './tag-picker-items';

/**
 * The tag the input of a new value shows for each kind of value it makes.
 */
const KIND_TAGS: Readonly<Record<NewValueKind, LiteralTagData>> = {
	resource: { text: 'resource', tooltip: 'Adds a resource; choose a datatype or language to add text', accessibleName: 'New value resource, change' },
	literal: { text: 'string', tooltip: 'Adds text; choose a datatype, a language or a resource', accessibleName: 'New value string, change' }
};

/**
 * Properties of the {@link NewValueKindMarker} component.
 */
export interface NewValueKindMarkerProps {
	/**
	 * The kind of value the typed text makes.
	 */
	kind: NewValueKind;

	/**
	 * The languages of the card, which the tag picker offers first.
	 */
	languages: readonly string[];

	/**
	 * Called with what the item picked gives the typed text.
	 */
	onPick: (choice: TagChoice) => void;

	/**
	 * Called when the tag picker is done with, so the input takes the focus back.
	 */
	onDone: () => void;
}

/**
 * The kind of value the input of a new value makes, shown after its text: `resource` or `string`.
 * It opens the tag picker with resource first, which keeps the text a resource, while a datatype
 * or a language makes a literal of it.
 * @param props The kind and what to do with a pick.
 * @returns The marker.
 */
export function NewValueKindMarker({ kind, languages, onPick, onDone }: NewValueKindMarkerProps): React.JSX.Element {
	const listId = useId();
	const picker = useTagPicker({ current: kind === 'resource' ? 'resource' : {}, languages, resourceItem: 'first', onPick, onDone });

	const toggle = (): void => {
		if (picker.open) {
			onDone();
		}

		picker.toggle();
	};

	return (
		<>
			<TagButton key={kind} tag={KIND_TAGS[kind]} guarded onAct={toggle} />
			{picker.open && <TagPicker picker={picker} listId={listId} />}
		</>
	);
}
