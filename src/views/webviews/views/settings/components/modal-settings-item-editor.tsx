import * as React from 'react';
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { ModalDialogHeaderActionsContext, ModalDialogTitleAccessoriesContext } from '@src/views/webviews/components/modal-dialog';
import { ScopeSelect } from '@src/views/webviews/components/scope-select';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { useStylesheet } from '@src/views/webviews/webview-hooks';
import modalFormStylesheet from '@src/views/webviews/components/modal-form.css';

export interface ModalSettingsItemEditorProps {
	/**
	 * Extra class for the `modal-form` root (e.g. `store-editor-content`, `validation-profile-editor`).
	 */
	className?: string;

	/**
	 * The current configuration scope of the item.
	 */
	scope: ConfigurationScope;

	/**
	 * Called when the scope picker changes.
	 */
	onScopeChange: (scope: ConfigurationScope) => void;

	/**
	 * Whether a workspace folder is open; disables the Workspace scope option when false.
	 */
	hasWorkspace?: boolean;

	/**
	 * Whether this is a brand-new (unsaved) item — hides the Delete action.
	 */
	isNew: boolean;

	/**
	 * Whether Save is enabled.
	 */
	canSave: boolean;

	/**
	 * Invoked when the Save button is clicked. The editor body is expected to have already checked for validity and applied any changes to the underlying settings object.
	 */
	onSave: () => void;

	/**
	 * Invoked when the Delete button is clicked. The editor body is expected to have already confirmed the deletion with the user.
	 */
	onDelete: () => void;

	/**
	 * Tooltip for the Save button.
	 */
	saveTitle?: string;

	/**
	 * Tooltip for the Delete button.
	 */
	deleteTitle?: string;

	/**
	 * When true, renders a read-only frame: no scope picker, a lock instead of Save/Delete.
	 */
	readOnly?: boolean;

	/**
	 * Tooltip for the read-only lock icon.
	 */
	readOnlyLabel?: string;

	/**
	 * The editor body (fields / tabs).
	 */
	children: React.ReactNode;
}

/**
 * The shared frame for a modal settings-item editor. Wraps the editor body in a
 * `modal-form` container and handles the portal boilerplate that both the store
 * and validation profile editors repeat: Save/Delete actions portaled into the
 * modal header, and the User/Workspace {@link ScopeSelect} portaled next to the
 * modal title. The field-specific body is supplied as `children`.
 */
export function ModalSettingsItemEditor({
	className,
	scope,
	onScopeChange,
	hasWorkspace,
	isNew,
	canSave,
	onSave,
	onDelete,
	saveTitle,
	deleteTitle,
	readOnly,
	readOnlyLabel,
	children,
}: ModalSettingsItemEditorProps) {
	useStylesheet('modal-form-styles', modalFormStylesheet);

	const headerActionsSlot = useContext(ModalDialogHeaderActionsContext);
	const titleAccessoriesSlot = useContext(ModalDialogTitleAccessoriesContext);

	const renderActions = () => (
		<div className={`form-actions ${readOnly ? 'readonly' : ''}`}>
			{readOnly && <vscode-icon name="lock" title={readOnlyLabel} />}
			{!readOnly && (
				<>
					{!isNew && (
						<vscode-toolbar-button title={deleteTitle} onClick={onDelete}>
							<vscode-icon name="trash" />
						</vscode-toolbar-button>
					)}
					<vscode-button title={saveTitle} onClick={onSave} disabled={!canSave}>
						Save
					</vscode-button>
				</>
			)}
		</div>
	);

	return (
		<div className={`modal-form ${className ?? ''}`.trim()}>
			{headerActionsSlot && createPortal(renderActions(), headerActionsSlot)}

			{!readOnly && titleAccessoriesSlot && createPortal(
				<ScopeSelect
					value={scope === ConfigurationScope.Workspace ? 'workspace' : 'user'}
					onChange={s => onScopeChange(s === 'workspace' ? ConfigurationScope.Workspace : ConfigurationScope.User)}
					hasWorkspace={hasWorkspace}
				/>,
				titleAccessoriesSlot
			)}

			{children}
		</div>
	);
}
