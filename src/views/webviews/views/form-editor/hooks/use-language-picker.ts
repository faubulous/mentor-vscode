import { useCallback, useMemo } from 'react';
import { LanguagePickerProps } from '../components/language-picker';
import { DocumentSnapshot } from '../form-editor-model';
import { FormEditorWebviewMessage } from '../form-editor-messages';
import { LanguageFilter } from '../state/language-filter';
import { PersistedViewState } from '../state/persisted-view-state';

/**
 * The language the form shows and the picker that chooses it.
 */
export interface LanguagePickerState {
	/**
	 * Which literal values the rows show.
	 */
	languageFilter: LanguageFilter;

	/**
	 * The picker, where the document writes language tags.
	 */
	pickerProps?: LanguagePickerProps;
}

/**
 * Show the literal values of the language the document is read in, or of every language. The
 * switch asks the host to let the user choose in Mentor's language quick pick; the choice comes
 * back as the language of the next snapshot, or as a change of the view state.
 * @param snapshot The snapshot of the document.
 * @param viewState The view state.
 * @param post Posts a message to the host.
 * @returns The filter of the rows and the picker.
 */
export function useLanguagePicker(
	snapshot: DocumentSnapshot | undefined,
	viewState: PersistedViewState,
	post: (message: FormEditorWebviewMessage) => void
): LanguagePickerState {
	const languageTags = snapshot?.languageTags;
	const activeLanguage = snapshot?.activeLanguage;
	const allLanguages = viewState.allLanguages === true;
	const hasLanguages = languageTags !== undefined && Object.keys(languageTags).length > 0;

	const onPick = useCallback(() => post({ id: 'PickLanguage', allLanguages }), [post, allLanguages]);

	return useMemo(() => ({
		languageFilter: hasLanguages && !allLanguages && activeLanguage ? new LanguageFilter(activeLanguage) : LanguageFilter.ALL,
		pickerProps: hasLanguages ? { languageTags, activeLanguage, allLanguages, onPick } : undefined
	}), [hasLanguages, allLanguages, activeLanguage, languageTags, onPick]);
}
