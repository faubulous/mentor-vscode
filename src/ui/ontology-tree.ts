import { OntologyNodeProvider } from "./ontology-node-provider";
import { ResourceTree } from "./resource-tree";

/**
 * Provides the ontology explorer and related commands.
 */
export class OntologyTree extends ResourceTree {
	get noItemsMessage(): string {
		return "No ontologies found.";
	}

	constructor() {
		super("mentor.view.ontologyTree", new OntologyNodeProvider());
	}

	protected registerCommands(): void {
	}
}