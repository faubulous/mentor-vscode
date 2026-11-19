import { useEffect, useState } from 'react';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * No languages, while the host has not answered or where the form editor offers no search.
 */
const NO_LANGUAGES: readonly string[] = [];

/**
 * The languages the workspace tags its literals with, asked of the host once the picker that
 * offers them is first in use, so they are read only where they are offered.
 * @param active Whether the picker is in use.
 * @returns The language tags, the most used first; none until the host answers.
 */
export function useWorkspaceLanguages(active: boolean): readonly string[] {
	const { termSearch } = useFormEditorContext();
	const [languages, setLanguages] = useState<readonly string[]>(NO_LANGUAGES);
	const [asked, setAsked] = useState(false);

	if (active && !asked) {
		setAsked(true);
	}

	useEffect(() => {
		if (!asked) {
			return undefined;
		}

		let current = true;

		void termSearch?.getWorkspaceLanguages().then(answer => {
			if (current) {
				setLanguages(answer);
			}
		});

		return () => {
			current = false;
		};
	}, [termSearch, asked]);

	return languages;
}
