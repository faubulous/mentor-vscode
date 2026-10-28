import { useMemo } from 'react';
import { formatIri } from '@src/utilities/prefixed-name';
import { NamespaceInfo, ResourceDetail, ResourceSummary } from '../form-editor-model';
import { LineVocabulary } from '../line/line-vocabulary';
import { PredicateEntry } from '../line/predicate-entry';
import { ResourceEntry } from '../line/resource-entry';
import { StatementTextService } from '../services/statement-text-service';
import { IStatementTextService } from '../services/statement-text-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * The statement text service of a card, built from the predicates of the card, the resources of
 * the document and the terms the card names.
 * @param detail The resource of the card.
 * @returns The service.
 */
export function useStatementTextService(detail: ResourceDetail): IStatementTextService {
	const { namespaces, resources } = useFormEditorContext();

	return useMemo(() => new StatementTextService(_vocabularyOf(detail, namespaces, resources)), [detail, namespaces, resources]);
}

/**
 * Build the vocabulary of a card.
 * @param detail The resource of the card.
 * @param namespaces The namespace declarations of the document.
 * @param resources The resources of the document.
 * @returns The vocabulary.
 */
function _vocabularyOf(detail: ResourceDetail, namespaces: readonly NamespaceInfo[], resources: readonly ResourceSummary[] = []): LineVocabulary {
	const prefixes = Object.fromEntries(namespaces.map(namespace => [namespace.prefix, namespace.iri]));
	const predicates: PredicateEntry[] = [];
	const entries: ResourceEntry[] = [];

	for (const property of detail.properties) {
		const predicate = property.predicate;

		if (predicate.term.kind === 'iri') {
			predicates.push({ curie: predicate.prefixedName ?? formatIri(prefixes, predicate.term.iri), iri: predicate.term.iri, label: predicate.label ?? '', range: property.valueKind?.kind ?? 'any' });
		}

		for (const value of property.values) {
			if (value.term.kind === 'iri' && value.label) {
				entries.push({ curie: value.prefixedName ?? formatIri(prefixes, value.term.iri), iri: value.term.iri, label: value.label, kind: 'vocabularyTerm', iconName: value.iconName });
			}
		}
	}

	// The resources of the document come last, so they win over a term named with the same IRI.
	for (const resource of resources) {
		if (resource.term.kind === 'iri') {
			entries.push({ curie: resource.prefixedName ?? formatIri(prefixes, resource.term.iri), iri: resource.term.iri, label: resource.label, kind: 'documentResource', iconName: resource.iconName });
		}
	}

	return new LineVocabulary({ namespaces: prefixes, predicates, resources: entries });
}
