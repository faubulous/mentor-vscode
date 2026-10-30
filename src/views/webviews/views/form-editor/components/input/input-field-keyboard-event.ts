/**
 * What the key resolver reads of a key event.
 */
export type InputFieldKeyboardEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'>;
