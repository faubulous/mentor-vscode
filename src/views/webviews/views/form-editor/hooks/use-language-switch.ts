import { useCallback, useMemo } from 'react';
import { LanguageSwitchProps } from '../components/language-switch';
import { DocumentSnapshot } from '../form-editor-model';
import { FormEditorWebviewMessage } from '../form-editor-messages';
import { LanguageFilter } from '../state/language-filter';
import { PersistedViewState, ViewStateChanges } from '../state/persisted-view-state';

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
 * Show the literal values of the language the document is read in, or of every language. Choosing a
 * language asks the host to read the document in it, which the next snapshot tells; showing every
 * language is a preference of the view.
 * @param snapshot The snapshot of the document.
 * @param viewState The view state.
 * @param updateViewState Changes the view state.
 * @param post Posts a message to the host.
 * @returns The filter of the rows and the switch.
 */
export function useLanguageSwitch(
	snapshot: DocumentSnapshot | undefined,
	viewState: PersistedViewState,
	updateViewState: (changes: ViewStateChanges) => void,
	post: (message: FormEditorWebviewMessage) => void
): LanguageSwitchState {
	const languageTags = snapshot?.languageTags;
	const activeLanguage = snapshot?.activeLanguage;
	const allLanguages = viewState.allLanguages === true;
	const hasLanguages = languageTags !== undefined && Object.keys(languageTags).length > 0;

	const onSelectLanguage = useCallback((language: string) => {
		updateViewState({ allLanguages: undefined });
		post({ id: 'SetActiveLanguage', language });
	}, [updateViewState, post]);

	const onSelectAll = useCallback(() => updateViewState({ allLanguages: true }), [updateViewState]);

	return useMemo(() => ({
		languageFilter: hasLanguages && !allLanguages && activeLanguage ? new LanguageFilter(activeLanguage) : LanguageFilter.ALL,
		switchProps: hasLanguages ? { languageTags, activeLanguage, allLanguages, onSelectLanguage, onSelectAll } : undefined
	}), [hasLanguages, allLanguages, activeLanguage, languageTags, onSelectLanguage, onSelectAll]);
}
