import { DragEvent, KeyboardEvent } from 'react';

/**
 * Properties of the {@link RowGrip} component.
 */
export interface RowGripProps {
	/**
	 * The label of the property of the row, which the grip is named after.
	 */
	label: string;

	/**
	 * Move the row one place up; absent where no row is above it.
	 */
	onMoveUp?: () => void;

	/**
	 * Move the row one place down; absent where no row is below it.
	 */
	onMoveDown?: () => void;

	/**
	 * Start dragging the row.
	 * @param event The event of the drag.
	 */
	onDragStart: (event: DragEvent<HTMLElement>) => void;

	/**
	 * End dragging the row, dropped or not.
	 */
	onDragEnd: () => void;
}

/**
 * The grip of a row, shown before the row while the pointer or the focus is in the row or in the
 * area of the grip beside it:
 * dragging it moves the row among the rows of its card, and ↑ and ↓ on the focused grip move the
 * row one place.
 * @param props The row and how it moves.
 * @returns The grip.
 */
export function RowGrip({ label, onMoveUp, onMoveDown, onDragStart, onDragEnd }: RowGripProps): React.JSX.Element {
	const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
		const move = event.key === 'ArrowUp' ? onMoveUp : event.key === 'ArrowDown' ? onMoveDown : undefined;

		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		move?.();
	};

	return (
		<span className="row-grip-area">
			<button
				type="button"
				className="icon-button row-grip"
				aria-label={`Move ${label}`}
				title="Drag to move, or press ↑ or ↓"
				draggable
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
				onKeyDown={handleKeyDown}
			>
				<vscode-icon name="gripper" size={14}></vscode-icon>
			</button>
		</span>
	);
}
