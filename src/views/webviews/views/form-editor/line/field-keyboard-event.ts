/**
 * What the key resolver reads from a key event: the key and its modifiers, and whether an input
 * method is composing a character.
 */
export type FieldKeyboardEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'>;
