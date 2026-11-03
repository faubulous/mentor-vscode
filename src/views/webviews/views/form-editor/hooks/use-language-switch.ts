import { useCallback, useMemo } from 'react';
import { LanguageSwitchProps } from '../components/language-switch';
import { DocumentSnapshot } from '../form-editor-model';
import { FormEditorWebviewMessage } from '../form-editor-messages';
import { LanguageFilter } from '../state/language-filter';
import { PersistedViewState } from '../state/persisted-view-state';

/**
 * The language the form shows and the switch that chooses it.
 */
export interface LanguageSwitchState {
	/**
	 * Which literal values the rows show.
	 */
	languageFilter: LanguageFilter;

	/**
	 * The switch, where the document writes language tags.
	 */
	switchProps?: LanguageSwitchProps;
}

/**
 * Show the literal values of the language the document is read in, or of every language. The
 * switch asks the host to let the user choose in Mentor's language quick pick; the choice comes
 * back as the language of the next snapshot, or as a change of the view state.
 * @param snapshot The snapshot of the document.
 * @param viewState The view state.
 * @param post Posts a message to the host.
 * @returns The filter of the rows and the switch.
 */
export function useLanguageSwitch(
	snapshot: DocumentSnapshot | undefined,
	viewState: PersistedViewState,
	post: (message: FormEditorWebviewMessage) => void
): LanguageSwitchState {
	const languageTags = snapshot?.languageTags;
	const activeLanguage = snapshot?.activeLanguage;
	const allLanguages = viewState.allLanguages === true;
	const hasLanguages = languageTags !== undefined && Object.keys(languageTags).length > 0;

	const onPick = useCallback(() => post({ id: 'PickLanguage', allLanguages }), [post, allLanguages]);

	return useMemo(() => ({
		languageFilter: hasLanguages && !allLanguages && activeLanguage ? new LanguageFilter(activeLanguage) : LanguageFilter.ALL,
		switchProps: hasLanguages ? { languageTags, activeLanguage, allLanguages, onPick } : undefined
	}), [hasLanguages, allLanguages, activeLanguage, languageTags, onPick]);
}
