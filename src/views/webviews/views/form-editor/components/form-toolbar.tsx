import { SectionHeaderContextMenu } from '@src/views/webviews/components/section-header-context-menu';
import { LanguagePicker, LanguagePickerProps } from './language-picker';

/**
 * Properties of the {@link FormToolbar} component.
 */
export interface FormToolbarProps {
	/**
	 * The language picker, where the document writes language tags.
	 */
	languages?: LanguagePickerProps;

	/**
	 * Whether the terms of other vocabularies the document only declares are left out of the list.
	 */
	externalDeclarationsHidden: boolean;

	/**
	 * Called when the external declarations are to be shown or hidden.
	 */
	onToggleExternalDeclarations: () => void;

	/**
	 * Whether the toolbar stays below the context bar, as it does once the title of the document
	 * has scrolled away: the two are one header then, which a line and a shadow end.
	 */
	stuck?: boolean;
}

/**
 * The bar under the title of the document, as wide as the column of the form, which stays below
 * the context bar once the title has scrolled away: the language picker and the menu of further
 * actions at its end. Ctrl+F searches the form with the search toolbar.
 * @param props The actions.
 * @returns The toolbar.
 */
export function FormToolbar({ languages, externalDeclarationsHidden, onToggleExternalDeclarations, stuck = false }: FormToolbarProps): React.JSX.Element {
	return (
		<div className={`form-toolbar${stuck ? ' is-stuck' : ''}`} role="toolbar" aria-label="Form editor">
			<div className="form-toolbar-content">
				<div className="form-toolbar-end">
					{languages && <LanguagePicker {...languages} />}
					<SectionHeaderContextMenu items={[
						{ label: externalDeclarationsHidden ? 'Show External Declarations' : 'Hide External Declarations', onClick: onToggleExternalDeclarations }
					]} />
				</div>
			</div>
		</div>
	);
}
