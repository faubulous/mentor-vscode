import { NamedNode } from '@rdfjs/types';
import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { IriField } from './iri-field';

/**
 * Properties of the {@link ResourceCardFooter} component.
 */
export interface ResourceCardFooterProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;

	/**
	 * Whether the card is expanded.
	 */
	expanded: boolean;
}

/**
 * The footer of a card, holding the full IRI of the resource. While the card is collapsed it is a
 * link that opens the IRI; while it is expanded it is a field that renames the resource where the
 * document can be written, and the footer stays at the bottom of the view while the card scrolls,
 * so the IRI is in view however long the card is. A blank node shows its identifier, which nothing
 * opens or renames.
 * @param props The resource and the state of the card.
 * @returns The footer.
 */
export function ResourceCardFooter({ summary, expanded }: ResourceCardFooterProps): React.JSX.Element {
	const { readOnly, onOpenExternal, onRenameResource } = useFormEditorContext();
	const named = summary.term.termType === 'NamedNode' ? summary.term : undefined;
	const written = named?.value ?? `_:${summary.term.value}`;
	const localPart = summary.localPart;
	const renamed = named && expanded && !readOnly && localPart !== undefined ? onRenameResource : undefined;
	const opened = named && !expanded ? onOpenExternal : undefined;

	return (
		<div className={`resource-card-footer${expanded ? ' is-expanded' : ''}`}>
			<span className="resource-card-iri" title={named?.value}>
				{_identifierOf(written, named, localPart, renamed, opened)}
			</span>
		</div>
	);
}

/**
 * The identifier of the resource as the footer shows it: the field of its IRI where the resource
 * can be renamed, a link where the IRI can be opened, else text.
 * @param written The identifier.
 * @param named The resource, where it has an IRI.
 * @param localPart The local part of the IRI, where it has one.
 * @param renamed Renames the resource, where the card allows it.
 * @param opened Opens the IRI, where the card allows it.
 * @returns The identifier.
 */
function _identifierOf(written: string, named: NamedNode | undefined, localPart: string | undefined, renamed: ((resource: NamedNode, iri: string) => void) | undefined, opened: ((iri: string) => void) | undefined): React.JSX.Element {
	if (named && renamed && localPart !== undefined) {
		return <IriField iri={written} namespace={written.slice(0, written.length - localPart.length)} onRename={text => renamed(named, text)} />;
	}

	if (named && opened) {
		return <button type="button" className="resource-card-iri-text resource-card-iri-link" onClick={() => opened(named.value)}>{written}</button>;
	}

	return <span className="resource-card-iri-text">{written}</span>;
}
