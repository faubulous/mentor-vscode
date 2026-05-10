import * as vscode from 'vscode';
import { OWL, rdf, sh } from '@faubulous/mentor-rdf';
import { MentorMcpServices, getWorkspaceGraphUris, getAnnotations, waitForReady } from '../mcp-utils';

interface GetVocabularyInput {
	includeProperties?: boolean;
	includeConcepts?: boolean;
	includeShapes?: boolean;
	limit?: number;
}

export class GetVocabularyTool implements vscode.LanguageModelTool<GetVocabularyInput> {
	constructor(private readonly services: MentorMcpServices) { }

	async invoke(
		options: vscode.LanguageModelToolInvocationOptions<GetVocabularyInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelToolResult> {
		await waitForReady(this.services);
		const { store, vocabulary } = this.services;
		const includeProperties = options.input.includeProperties ?? true;
		const includeConcepts = options.input.includeConcepts ?? true;
		const includeShapes = options.input.includeShapes ?? true;
		const limit = options.input.limit ?? 500;
		const graphUris = getWorkspaceGraphUris(store);
		const opts = { includeInferred: true };

		console.time('[mentor-mcp] get-vocabulary total');
		console.time('[mentor-mcp] ontologies');
		const ontologies = [...vocabulary.getOntologies(graphUris)].map(iri => ({
			iri,
			version: vocabulary.getOntologyVersionInfo(graphUris, iri)
		}));
		console.timeEnd('[mentor-mcp] ontologies');

		console.time('[mentor-mcp] conceptSchemes');
		const conceptSchemes = [...vocabulary.getConceptSchemes(graphUris)].map(iri => ({
			iri,
			labels: getAnnotations(store, graphUris, iri, 'predicates.label')
		}));
		console.timeEnd('[mentor-mcp] conceptSchemes');

		console.time('[mentor-mcp] classes');
		const classes = [...vocabulary.getClasses(graphUris, opts)].slice(0, limit).map(iri => ({
			iri,
			labels: getAnnotations(store, graphUris, iri, 'predicates.label'),
			descriptions: getAnnotations(store, graphUris, iri, 'predicates.description'),
			superClasses: [...vocabulary.getSuperClasses(graphUris, iri, opts)]
		}));
		console.timeEnd('[mentor-mcp] classes');

		let properties: object[] = [];

		if (includeProperties) {
			console.time('[mentor-mcp] properties');
			properties = [...vocabulary.getProperties(graphUris, opts)].slice(0, limit).map(iri => {
				const subjectNode = { termType: 'NamedNode', value: iri } as any;
				let type = 'rdf:Property';

				for (const quad of store.matchAll(graphUris, subjectNode, rdf.type, null, true)) {
					const typeVal = quad.object.value;
					if (typeVal === OWL.ObjectProperty) { type = 'owl:ObjectProperty'; break; }
					if (typeVal === OWL.DatatypeProperty) { type = 'owl:DatatypeProperty'; break; }
					if (typeVal === OWL.AnnotationProperty) { type = 'owl:AnnotationProperty'; break; }
				}

				return {
					iri,
					type,
					labels: getAnnotations(store, graphUris, iri, 'predicates.label'),
					descriptions: getAnnotations(store, graphUris, iri, 'predicates.description'),
					domain: vocabulary.getDomain(graphUris, iri) || undefined,
					range: vocabulary.getRange(graphUris, iri)
				};
			});
			console.timeEnd('[mentor-mcp] properties');
		}

		let concepts: object[] = [];

		if (includeConcepts) {
			console.time('[mentor-mcp] concepts');
			concepts = [...vocabulary.getConcepts(graphUris)].slice(0, limit).map(iri => ({
				iri,
				labels: getAnnotations(store, graphUris, iri, 'predicates.label'),
				descriptions: getAnnotations(store, graphUris, iri, 'predicates.description'),
				broaderConcepts: [...vocabulary.getBroaderConcepts(graphUris, iri)]
			}));
			console.timeEnd('[mentor-mcp] concepts');
		}

		let shapes: object[] = [];

		if (includeShapes) {
			console.time('[mentor-mcp] shapes');
			shapes = [...vocabulary.getShapes(graphUris)].map(shapeIri => {
				const shapeNode = { termType: 'NamedNode', value: shapeIri } as any;
				const targetClasses = [...vocabulary.getShapeTargets(graphUris, shapeNode)];
				const propertyShapes: object[] = [];

				for (const pQuad of store.matchAll(graphUris, shapeNode, sh.property, null, true)) {
					const propNode = pQuad.object as any;
					const pathQuad = [...store.matchAll(graphUris, propNode, sh.path, null, true)][0];
					const classQuad = [...store.matchAll(graphUris, propNode, sh['class'], null, true)][0];
					const datatypeQuad = [...store.matchAll(graphUris, propNode, sh.datatype, null, true)][0];
					const minQuad = [...store.matchAll(graphUris, propNode, sh.minCount, null, true)][0];
					const maxQuad = [...store.matchAll(graphUris, propNode, sh.maxCount, null, true)][0];

					const propShape: Record<string, any> = {};
					const pathIri = pathQuad?.object.value;

					if (pathIri) {
						propShape.path = pathIri;
						propShape.labels = getAnnotations(store, graphUris, pathIri, 'predicates.label');
					}
					if (classQuad) propShape.class = classQuad.object.value;
					if (datatypeQuad) propShape.datatype = datatypeQuad.object.value;
					if (minQuad) propShape.minCount = Number(minQuad.object.value);
					if (maxQuad) propShape.maxCount = Number(maxQuad.object.value);

					if (pathIri || classQuad) propertyShapes.push(propShape);
				}

				return {
					iri: shapeIri,
					labels: getAnnotations(store, graphUris, shapeIri, 'predicates.label'),
					targetClasses,
					properties: propertyShapes
				};
			});
			console.timeEnd('[mentor-mcp] shapes');
		}

		const result = { ontologies, conceptSchemes, classes, properties, concepts, shapes };
		console.timeEnd('[mentor-mcp] get-vocabulary total');
		return new vscode.LanguageModelToolResult([
			new vscode.LanguageModelTextPart(JSON.stringify(result))
		]);
	}

	async prepareInvocation(
		_options: vscode.LanguageModelToolInvocationPrepareOptions<GetVocabularyInput>,
		_token: vscode.CancellationToken
	): Promise<vscode.PreparedToolInvocation> {
		return { invocationMessage: 'Loading vocabulary from workspace store' };
	}
}
