import { useEffect, useState } from 'react';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * No languages, while the host has not answered or where the form editor offers no search.
 */
const NO_LANGUAGES: readonly string[] = [];

/**
 * The languages the workspace tags its literals with, asked of the host once the component that
 * offers them appears, so they are read only where they are offered.
 * @returns The language tags, the most used first; none until the host answers.
 */
export function useWorkspaceLanguages(): readonly string[] {
	const { termSearch } = useFormEditorContext();
	const [languages, setLanguages] = useState<readonly string[]>(NO_LANGUAGES);

	useEffect(() => {
		let current = true;

		void termSearch?.getWorkspaceLanguages().then(answer => {
			if (current) {
				setLanguages(answer);
			}
		});

		return () => {
			current = false;
		};
	}, [termSearch]);

	return languages;
}
