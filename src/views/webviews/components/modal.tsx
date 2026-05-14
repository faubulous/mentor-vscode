import * as React from 'react';
import { createContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStylesheet } from '../webview-hooks';
import stylesheet from './modal.css';

/**
 * Context exposing the DOM element that backs the Modal's header-actions slot.
 * Descendants may portal controls (e.g. Save / Delete buttons) into this element
 * to render them next to the title and close button, conserving vertical space.
 * Value is `null` when not inside a Modal.
 */
export const ModalHeaderActionsContext = createContext<HTMLElement | null>(null);

export interface ModalProps {
	/** Whether the modal is currently visible. When false, the modal is unmounted. */
	open: boolean;
	/** Title shown in the modal header. */
	title: string;
	/** Called when the user has requested to close the modal and any confirmation passed. */
	onClose: () => void;
	/**
	 * When true, close requests (Escape, X button) show an inline confirmation panel
	 * instead of closing immediately. Toggle this based on dirty state.
	 */
	requireCloseConfirmation?: boolean;
	/** Message shown in the close confirmation panel. */
	closeConfirmationMessage?: string;
	/** Label for the button that confirms the close. Defaults to "Discard". */
	closeConfirmLabel?: string;
	/**
	 * When true, the title-bar X button is hidden. The modal can still be closed
	 * via Escape and a backdrop click.
	 */
	hideCloseButton?: boolean;
	children: React.ReactNode;
}

/**
 * A reusable modal dialog for webviews. Renders a centered dialog over a dimmed
 * backdrop via a portal attached to `document.body`. Theme tokens follow the
 * VS Code editor-widget palette so the dialog blends with the host UI.
 *
 * Dismissal: Escape and the X button trigger close. When `requireCloseConfirmation`
 * is true the modal shows an inline confirmation panel rather than closing
 * directly (VS Code webviews block `window.confirm`, so we render our own).
 *
 * Header slot: the modal exposes {@link ModalHeaderActionsContext}; descendants may
 * portal additional controls into the title bar via that context's element.
 */
export function Modal({
	open,
	title,
	onClose,
	requireCloseConfirmation,
	closeConfirmationMessage,
	closeConfirmLabel,
	hideCloseButton,
	children,
}: ModalProps) {
	useStylesheet('mentor-modal-styles', stylesheet);

	const dialogRef = useRef<HTMLDivElement | null>(null);
	const previouslyFocusedRef = useRef<HTMLElement | null>(null);
	const [actionsSlotEl, setActionsSlotEl] = useState<HTMLDivElement | null>(null);
	const [showConfirm, setShowConfirm] = useState(false);

	const showConfirmRef = useRef(showConfirm);
	showConfirmRef.current = showConfirm;

	const requireCloseConfirmationRef = useRef(requireCloseConfirmation);
	requireCloseConfirmationRef.current = requireCloseConfirmation;

	const requestClose = () => {
		if (requireCloseConfirmationRef.current) {
			setShowConfirm(true);
		} else {
			onClose();
		}
	};

	useEffect(() => {
		if (!open) {
			setShowConfirm(false);
			return;
		}

		previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
			? document.activeElement
			: null;

		dialogRef.current?.focus();

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				if (showConfirmRef.current) {
					setShowConfirm(false);
				} else if (requireCloseConfirmationRef.current) {
					setShowConfirm(true);
				} else {
					onClose();
				}
			}
		};
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			previouslyFocusedRef.current?.focus?.();
			previouslyFocusedRef.current = null;
		};
	}, [open, onClose]);

	if (!open) {
		return null;
	}

	const handleOverlayMouseDown = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			requestClose();
		}
	};

	return createPortal(
		<div className="mentor-modal-overlay" role="presentation" onMouseDown={handleOverlayMouseDown}>
			<div
				className="mentor-modal-dialog"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				tabIndex={-1}
				ref={dialogRef}
			>
				<div className="mentor-modal-header">
					<h2 className="mentor-modal-title">{title}</h2>
					<div className="mentor-modal-header-actions" ref={setActionsSlotEl} />
					{!hideCloseButton && (
						<vscode-toolbar-button
							className="mentor-modal-close"
							title="Close"
							onClick={(e: React.MouseEvent) => { e.preventDefault(); requestClose(); }}
						>
							<vscode-icon name="close" />
						</vscode-toolbar-button>
					)}
				</div>
				<ModalHeaderActionsContext.Provider value={actionsSlotEl}>
					<div className="mentor-modal-body">
						{children}
					</div>
				</ModalHeaderActionsContext.Provider>
				{showConfirm && (
					<div className="mentor-modal-confirm-overlay" role="alertdialog" aria-modal="true">
						<div className="mentor-modal-confirm-panel">
							<p className="mentor-modal-confirm-message">
								{closeConfirmationMessage ?? 'Are you sure you want to close?'}
							</p>
							<div className="mentor-modal-confirm-actions">
								<vscode-button secondary onClick={() => setShowConfirm(false)}>
									Cancel
								</vscode-button>
								<vscode-button onClick={() => { setShowConfirm(false); onClose(); }}>
									{closeConfirmLabel ?? 'Discard'}
								</vscode-button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>,
		document.body
	);
}
