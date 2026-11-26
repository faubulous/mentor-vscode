import { Fragment } from 'react';
import { ResourceCardHeaderData } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * The labels of the types a card names for its resource.
 */
export interface ShownTypeLabels {
	/**
	 * The labels of the types it asserts, each once, in the order asserted.
	 */
	asserted: string[];

	/**
	 * The labels of the types the reasoner infers besides those, each once, where the form shows
	 * what is inferred.
	 */
	inferred: string[];
}

/**
 * Properties of the {@link ResourceCardTypes} component.
 */
export interface ResourceCardTypesProps {
	/**
	 * The resource.
	 */
	cardHeader: ResourceCardHeaderData;

	/**
	 * The class name of the element.
	 */
	className: string;
}

/**
 * The types a card names for its resource, in a line: those it asserts, and after them, in
 * italics, those the reasoner infers, where the form shows what is inferred.
 * @param props The resource.
 * @returns The types.
 */
export function ResourceCardTypes({ cardHeader, className }: ResourceCardTypesProps): React.JSX.Element {
	const { showInferred = true } = useFormEditorContext();
	const { asserted, inferred } = getShownTypeLabels(cardHeader, showInferred);
	const all = [...asserted, ...inferred];

	return (
		<span className={className} title={all.join(', ') || undefined}>
			{asserted.join(', ')}
			{inferred.map((label, index) => (
				<Fragment key={label}>
					{asserted.length > 0 || index > 0 ? ', ' : ''}
					<span className="is-inferred">{label}</span>
				</Fragment>
			))}
		</span>
	);
}

/**
 * The labels of the types a card names for its resource: every type it asserts, and every other
 * type the reasoner infers, each once.
 * @param cardHeader The resource.
 * @param showInferred Whether the form shows what is inferred.
 * @returns The labels.
 */
export function getShownTypeLabels(cardHeader: ResourceCardHeaderData, showInferred: boolean): ShownTypeLabels {
	const asserted = Array.from(new Set(cardHeader.typeLabels ?? (cardHeader.typeLabel ? [cardHeader.typeLabel] : [])));
	const inferred = showInferred ? Array.from(new Set(cardHeader.inferredTypeLabels ?? [])).filter(label => !asserted.includes(label)) : [];

	return { asserted, inferred };
}
