import { SectionHeaderContextMenu } from '@src/views/webviews/components/section-header-context-menu';
import { FilterField, FilterFieldProps } from './filter-field';

/**
 * Properties of the {@link FormToolbar} component.
 */
export interface FormToolbarProps {
	/**
	 * The filter field.
	 */
	filter: FilterFieldProps;

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
 * The bar along the top of the editor, which stays while the form scrolls: the filter in its
 * middle and the menu of further actions at its end.
 * @param props The filter and the actions.
 * @returns The toolbar.
 */
export function FormToolbar({ filter, externalDeclarationsHidden, onToggleExternalDeclarations }: FormToolbarProps): React.JSX.Element {
	return (
		<div className="form-toolbar" role="toolbar" aria-label="Form editor">
			<div className="form-toolbar-content">
				<div className="form-toolbar-start" />
				<div className="form-toolbar-middle"><FilterField {...filter} /></div>
				<div className="form-toolbar-end">
					<SectionHeaderContextMenu items={[
						{ label: externalDeclarationsHidden ? 'Show External Declarations' : 'Hide External Declarations', onClick: onToggleExternalDeclarations }
					]} />
				</div>
			</div>
		</div>
	);
}
