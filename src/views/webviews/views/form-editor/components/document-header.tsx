import { Ref } from 'react';
import { ResourceSummary } from '../form-editor-model';
import { getHeadword } from './headword';
import { ResourceIcon } from './resource-icon';

/**
 * Properties of the {@link DocumentHeader} component.
 */
export interface DocumentHeaderProps {
	/**
	 * The file name of the document, its title when no resource describes it.
	 */
	fileName: string;

	/**
	 * The resource describing the document, such as its ontology, when there is one.
	 */
	documentResource?: ResourceSummary;

	/**
	 * The title element, which the context bar appears for once it has scrolled away.
	 */
	titleRef?: Ref<HTMLDivElement>;
}

/**
 * The head of the form: the document by the resource describing it, or by its file name, with
 * the IRI of that resource below.
 * @param props The file name and the resource describing the document.
 * @returns The header.
 */
export function DocumentHeader({ fileName, documentResource, titleRef }: DocumentHeaderProps): React.JSX.Element {
	const title = documentResource ? getHeadword(documentResource) : fileName;
	const iri = documentResource?.term.kind === 'iri' ? documentResource.term.iri : undefined;

	return (
		<header className="document-header">
			<div className="document-header-title" ref={titleRef}>
				{documentResource && <ResourceIcon iconName={documentResource.iconName} size={18} />}
				<h1>{title}</h1>
			</div>
			<div className="document-header-subline">{iri ?? fileName}</div>
		</header>
	);
}
