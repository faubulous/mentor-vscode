import * as vscode from 'vscode';
import { RDF, RDFS, OWL, SKOS } from '@faubulous/mentor-rdf';
import { PrioritySortingStrategy, PriorityStrategyConfig } from '@faubulous/mentor-rdf-serializers';
import { getConfig } from '@src/utilities/vscode/config';
import { sortDocument } from './sort-document';

const defaultTypeSortingOptions: PriorityStrategyConfig = {
	typeOrder: [
		OWL.Ontology,
		OWL.Class,
		RDFS.Class,
		OWL.ObjectProperty,
		OWL.DatatypeProperty,
		OWL.AnnotationProperty,
		RDF.Property,
		OWL.NamedIndividual,
		SKOS.ConceptScheme,
		SKOS.Collection,
		SKOS.Concept
	],
	predicateOrder: [
		RDF.type
	],
	unmatchedPosition: 'end',
	unmatchedSort: 'alphabetical'
};

export const sortDocumentByType = {
	id: 'mentor.command.sortDocumentByType',
	handler: async (documentUri?: vscode.Uri) => {
		const options = getConfig().get<PriorityStrategyConfig>('sorting.typeSortingOptions', defaultTypeSortingOptions);
		await sortDocument(documentUri, new PrioritySortingStrategy(options));
	}
};

export const sortDocumentByTypeSubmenu = {
	id: 'mentor.command.sortDocumentByTypeSubmenu',
	handler: sortDocumentByType.handler
};
