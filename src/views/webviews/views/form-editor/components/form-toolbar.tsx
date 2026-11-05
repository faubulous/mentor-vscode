import { SectionHeaderContextMenu } from '@src/views/webviews/components/section-header-context-menu';
import { FilterField, FilterFieldProps } from './filter-field';
import { LanguagePicker, LanguagePickerProps } from './language-picker';

/**
 * Properties of the {@link FormToolbar} component.
 */
export interface FormToolbarProps {
	/**
	 * The filter field.
	 */
	filter: FilterFieldProps;

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
}

/**
 * The bar under the title of the document, as wide as the column of the form, which stays below
 * the context bar once the title has scrolled away: the filter at its start, and the language
 * picker and the menu of further actions at its end.
 * @param props The filter and the actions.
 * @returns The toolbar.
 */
export function FormToolbar({ filter, languages, externalDeclarationsHidden, onToggleExternalDeclarations }: FormToolbarProps): React.JSX.Element {
	return (
		<div className="form-toolbar" role="toolbar" aria-label="Form editor">
			<div className="form-toolbar-content">
				<div className="form-toolbar-start"><FilterField {...filter} /></div>
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
