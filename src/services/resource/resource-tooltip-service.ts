import * as vscode from 'vscode';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { RevealDefinitionOptions, RevealScope } from '@src/commands/definition-tree/reveal-definition.interface';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getConfig } from '@src/utilities/vscode/config';
import { ResourceCardService } from './resource-card-service';
import { ResourceTooltipMarkdown } from './resource-tooltip-markdown';

/**
 * The command the links of a tooltip run, the only one its Markdown is trusted to run.
 */
const REVEAL_DEFINITION_COMMAND = 'mentor.command.revealDefinition';

/**
 * Gives the tooltips of resources in the definition tree and the hovers of the text editor: the
 * compact card of the form editor, as Markdown, which VS Code renders natively. Its resources link
 * to their definitions, which "Go to Definition" looks for where `mentor.tooltips.revealScope`
 * says.
 */
export class ResourceTooltipService {
	/**
	 * Create the service.
	 * @param _cards Builds the cards of resources read from the store.
	 */
	constructor(private readonly _cards: ResourceCardService) { }

	/**
	 * The tooltip of a resource as the store states it, with the labels, descriptions and language of
	 * a document; for a resource the store states nothing about, its label and identifier.
	 * @param resource The resource: an IRI, or a blank node of a document of the workspace.
	 * @param context The document the tooltip is shown for.
	 * @returns The tooltip.
	 */
	getTooltip(resource: NamedNode | BlankNode, context: IDocumentContext): vscode.MarkdownString {
		const options: RevealDefinitionOptions = { scope: getConfig().get<RevealScope>('tooltips.revealScope', 'workspace') };
		const markdown = new ResourceTooltipMarkdown({
			labelPredicates: context.predicates.label,
			descriptionPredicates: context.predicates.description,
			language: context.activeLanguageTag,
			linkOf: linked => _revealDefinitionUri(linked, options)
		});
		const card = this._cards.getStoreCard(resource, context);
		const text = card ? markdown.render(card) : markdown.renderUnknown(resource, context.getResourceLabel(resource.value).value);
		const tooltip = new vscode.MarkdownString(text);

		tooltip.isTrusted = { enabledCommands: [REVEAL_DEFINITION_COMMAND] };

		return tooltip;
	}
}

/**
 * The target of a link that runs "Go to Definition" for a resource.
 * @param resource The resource.
 * @param options Where the definition is looked for.
 * @returns The command URI, its parentheses encoded too, as a Markdown link target ends at one.
 */
function _revealDefinitionUri(resource: NamedNode | BlankNode, options: RevealDefinitionOptions): string {
	const argumentsText = encodeURIComponent(JSON.stringify([resource.value, options])).replace(/\(/g, '%28').replace(/\)/g, '%29');

	return `command:${REVEAL_DEFINITION_COMMAND}?${argumentsText}`;
}
