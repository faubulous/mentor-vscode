import { _SH, SH } from "@faubulous/mentor-rdf";
import { container, VocabularyRepository } from "@src/container";
import { ClassNodeBase } from "./class-node-base";
import { NodeShapeNode, PropertyShapeNode, ParameterNode } from "./shape-node";

export class ShapeClassNode extends ClassNodeBase {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

	override getOntologyGraphs(): string[] {
		return [_SH, ...this.document.graphs];
	}

	override *getSubClassIris(): IterableIterator<string> {
		const options = this.getQueryOptions();
		options.notDefinedBy?.add(_SH);

		const uri = this.uri.startsWith('mentor') ? SH.Shape : this.uri;
		const classIris = this.vocabulary.getSubClasses(this.getOntologyGraphs(), uri);

		for (const c of classIris) {
			if (this.vocabulary.hasSubjectsOfType(this.getDocumentGraphs(), c, options)) {
				yield c;
			}
		}
	}

	override getClassNode(iri: string) {
		return this.createChildNode(ShapeClassNode, iri);
	}

	override getIndividualNode(iri: string) {
		const graphs = this.getOntologyGraphs();
		const options = this.getQueryOptions({ includeInferred: true });

		if (this.vocabulary.hasType(graphs, iri, SH.Parameter, options)) {
			return this.createChildNode(ParameterNode, iri);
		} else if (this.vocabulary.hasType(graphs, iri, SH.PropertyShape, options)) {
			return this.createChildNode(PropertyShapeNode, iri);
		} else {
			return this.createChildNode(NodeShapeNode, iri);
		}
	}
}