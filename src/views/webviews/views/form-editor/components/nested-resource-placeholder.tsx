import { NestedResourceRef } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * Properties of the {@link NestedResourcePlaceholder} component.
 */
export interface NestedResourcePlaceholderProps {
	/**
	 * The blank node the placeholder stands for.
	 */
	nested: NestedResourceRef;
}

/**
 * Stands in for a blank node that is not rendered in place, because it is nested too deeply.
 * Activating it scrolls to the node.
 * @param props The blank node.
 * @returns The placeholder.
 */
export function NestedResourcePlaceholder({ nested }: NestedResourcePlaceholderProps): React.JSX.Element {
	const { onRevealResource } = useFormEditorContext();
	const properties = `${nested.propertyCount} ${nested.propertyCount === 1 ? 'property' : 'properties'}`;
	const name = nested.label ?? nested.typeLabel;

	return (
		<button type="button" className="nested-placeholder" title="Show this blank node" onClick={() => onRevealResource?.(nested.id)}>
			<span>[ {name ? `${name} · ${properties}` : properties} ]</span>
			<vscode-icon name="arrow-right"></vscode-icon>
		</button>
	);
}
