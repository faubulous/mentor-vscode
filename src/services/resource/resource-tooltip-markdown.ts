import { BlankNode, NamedNode, Term } from '@rdfjs/types';
import { RDF } from '@faubulous/mentor-rdf';
import { PinnedProperty, PredicateData, ResourceCardData, TermData } from './resource-card-data';
import { getTermLabel } from './term-labels';

/**
 * What decides which statements a tooltip shows of a card.
 */
export interface ResourceTooltipOptions {
	/**
	 * The label predicates, most preferred first; the one the title shows is not repeated below it.
	 */
	labelPredicates: readonly string[];

	/**
	 * The description predicates, most preferred first.
	 */
	descriptionPredicates: readonly string[];

	/**
	 * The language literals are shown in, besides those without a language; all when absent.
	 */
	language?: string;

	/**
	 * The target of a link to a resource, which goes to its definition; no links when absent.
	 * @param resource The resource.
	 * @returns The target, or `undefined` for no link.
	 */
	linkOf?: (resource: NamedNode | BlankNode) => string | undefined;
}

/**
 * A property the tooltip shows below the title: a pinned one with its caption, or the description
 * of the resource, which it shows without one.
 */
interface TooltipItem {
	/**
	 * Whether the item is the description of the resource.
	 */
	description: boolean;

	/**
	 * The property.
	 */
	property: PredicateData;

	/**
	 * The values shown, those of other languages left out.
	 */
	values: TermData[];
}

/**
 * The characters Markdown gives a meaning, which text of the store is written with a backslash.
 */
const MARKDOWN_CHARACTERS = /[\\`*_{}[\]()#+\-.!|<>~]/g;

/**
 * Renders the compact card of a resource as Markdown, for the tooltips of the definition tree and
 * the hovers of the text editor, which VS Code renders natively and which therefore cannot show
 * the card of the form editor itself. It shows what that card shows, laid out as the larger card:
 * the labels of the types and the usage count in a line ruled off above the label, the pinned
 * properties of its types as lines of their names and values, in document order with its
 * description, or else the description alone, and below a rule the IRI. The resources, the
 * captions of the properties, the types and the IRI link to their definitions where the options
 * give links. Everything taken from the store is escaped; the Markdown has no HTML and no icons.
 */
export class ResourceTooltipMarkdown {
	/**
	 * Create the renderer.
	 * @param _options What decides which statements a tooltip shows.
	 */
	constructor(private readonly _options: ResourceTooltipOptions) { }

	/**
	 * Render the compact card of a resource.
	 * @param card The card.
	 * @returns The Markdown.
	 */
	render(card: ResourceCardData): string {
		const header = card.cardHeader;

		return _joinBlocks([this._titleOf(card), this._bodyOf(card), '---', this._identifierOf(header.subject)]);
	}

	/**
	 * Render the tooltip of a resource the store states nothing about: its label and its identifier.
	 * @param resource The resource.
	 * @param label The label of the resource.
	 * @returns The Markdown.
	 */
	renderUnknown(resource: NamedNode | BlankNode, label: string): string {
		return _joinBlocks([`**${_escape(label)}**`, '---', this._identifierOf(resource)]);
	}

	/**
	 * The title of the card, as the title bar and the header of the larger card show it: the types
	 * and the usage count in a line in italics, a rule as the line under the title bar, and under it
	 * the label in bold. The types are those the statements of the card assert, so that each links to
	 * its definition, else the labels of the header.
	 * @param card The card.
	 * @returns The Markdown.
	 */
	private _titleOf(card: ResourceCardData): string {
		const header = card.cardHeader;
		const asserted = card.cardBody.predicates.find(property => property.predicate.term.value === RDF.type)?.values.filter(value => value.term.termType !== 'Literal') ?? [];
		const types = asserted.length > 0
			? _uniqueBy(asserted, value => getTermLabel(value)).map(value => this._link(getTermLabel(value), value.term as NamedNode | BlankNode))
			: Array.from(new Set(header.typeLabels ?? (header.typeLabel ? [header.typeLabel] : []))).map(_escape);
		const usages = header.usageCount === undefined ? [] : [`${header.usageCount} ${header.usageCount === 1 ? 'usage' : 'usages'}`];
		const bar = [...(types.length > 0 ? [types.join(', ')] : []), ...usages].join(' · ');
		const label = `**${_escape(header.label)}**`;

		return bar ? _joinBlocks([`_${bar}_`, '---', label]) : label;
	}

	/**
	 * The footer of the card: the identifier of the resource, linked to its definition where the
	 * options give links, else as code.
	 * @param resource The resource.
	 * @returns The Markdown.
	 */
	private _identifierOf(resource: NamedNode | BlankNode): string {
		const identifier = resource.termType === 'BlankNode' ? `_:${resource.value}` : resource.value;

		return this._options.linkOf?.(resource) ? this._link(identifier, resource) : _codeSpan(identifier);
	}

	/**
	 * The body of the card: the pinned properties and the description, where the resource has pins,
	 * else the description alone.
	 * @param card The card.
	 * @returns The Markdown, or `undefined` where there is nothing to show.
	 */
	private _bodyOf(card: ResourceCardData): string | undefined {
		const pins = card.cardHeader.pins ?? [];

		if (pins.length === 0) {
			return card.cardHeader.description ? _escape(card.cardHeader.description) : undefined;
		}

		const blocks: string[] = [];
		let lines: string[] = [];

		for (const item of this._itemsOf(card, pins)) {
			if (item.description) {
				blocks.push(lines.join('  \n'), _escape(item.values.map(value => value.term.value).join(' ')));
				lines = [];
			} else {
				const predicate = item.property.predicate;

				lines.push(`${this._link(getTermLabel(predicate), predicate.term as NamedNode)}: ${item.values.map(value => this._valueOf(value)).join(', ')}`);
			}
		}

		blocks.push(lines.join('  \n'));

		return _joinBlocks(blocks);
	}

	/**
	 * The pinned properties the resource has and its description, the most preferred description
	 * predicate it has, in the order the document writes them, as the collapsed card of the form
	 * editor lists them. The label the title shows is left out, and so is a property without a
	 * value in the language shown.
	 * @param card The card.
	 * @param pins The pins of the types of the resource.
	 * @returns The items.
	 */
	private _itemsOf(card: ResourceCardData, pins: readonly PinnedProperty[]): TooltipItem[] {
		const predicates = card.cardBody.predicates;
		const has = (iri: string): boolean => predicates.some(property => property.predicate.term.value === iri);
		const title = this._options.labelPredicates.find(has);
		const description = this._options.descriptionPredicates
			.map(iri => predicates.find(property => property.predicate.term.value === iri))
			.find(property => property !== undefined && this._shownValuesOf(property).length > 0);

		return predicates.flatMap(property => {
			const iri = property.predicate.term.value;
			const pinned = iri !== title && pins.some(pin => pin.predicate.value === iri);
			const values = this._shownValuesOf(property);

			return (pinned || property === description) && values.length > 0 ? [{ description: property === description, property, values }] : [];
		});
	}

	/**
	 * The values of a property the tooltip shows: literals in the language shown or without one, and
	 * every other value.
	 * @param property The property.
	 * @returns The values.
	 */
	private _shownValuesOf(property: PredicateData): TermData[] {
		return property.values.filter(value => this._shows(value.term));
	}

	/**
	 * Whether the tooltip shows a term in the language it shows.
	 * @param term The term.
	 * @returns `true` for a literal in that language or without one, and for any other term.
	 */
	private _shows(term: Term): boolean {
		const language = this._options.language;

		return language === undefined || term.termType !== 'Literal' || !term.language || term.language === language;
	}

	/**
	 * A value of a pinned property: a list as its items, a blank node as a line that names it, a
	 * literal as its text and a resource by its label, as the collapsed card of the form editor
	 * shows them, the resources linked to their definitions.
	 * @param value The value.
	 * @returns The Markdown.
	 */
	private _valueOf(value: TermData): string {
		if (value.collection) {
			return `\\(${value.collection.items.map(item => this._valueOf(item)).join(', ')}\\)`;
		}

		const term = value.term;

		if (value.nested) {
			const name = value.nested.label ?? value.nested.typeLabel ?? 'blank node';

			return this._link(`[ ${name} · ${value.nested.propertyCount} ${value.nested.propertyCount === 1 ? 'property' : 'properties'} ]`, value.nested.term);
		}

		return term.termType === 'Literal' ? _escape(term.value) : this._link(getTermLabel(value), term);
	}

	/**
	 * A text linked to the definition of a resource where the options give links, else the text.
	 * @param text The text, not escaped.
	 * @param resource The resource.
	 * @returns The Markdown.
	 */
	private _link(text: string, resource: NamedNode | BlankNode): string {
		const target = this._options.linkOf?.(resource);

		return target ? `[${_escape(text)}](${target})` : _escape(text);
	}
}

/**
 * The items of a list, each key once, in order.
 * @param items The items.
 * @param keyOf The key of an item.
 * @returns The items.
 */
function _uniqueBy<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
	const seen = new Set<string>();

	return items.filter(item => {
		const key = keyOf(item);

		if (seen.has(key)) {
			return false;
		}

		seen.add(key);

		return true;
	});
}

/**
 * Join the blocks of a Markdown text, separated by blank lines, leaving out the empty ones.
 * @param blocks The blocks.
 * @returns The text.
 */
function _joinBlocks(blocks: readonly (string | undefined)[]): string {
	return blocks.filter(block => block).join('\n\n');
}

/**
 * Escape the characters Markdown gives a meaning in text taken from the store.
 * @param text The text.
 * @returns The escaped text.
 */
function _escape(text: string): string {
	return text.replace(MARKDOWN_CHARACTERS, character => `\\${character}`);
}

/**
 * Write a text as inline code, fenced with more backticks than it contains in a row.
 * @param text The text.
 * @returns The code span.
 */
function _codeSpan(text: string): string {
	const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map(run => run.length));
	const fence = '`'.repeat(longest + 1);
	const padding = text.startsWith('`') || text.endsWith('`') ? ' ' : '';

	return `${fence}${padding}${text}${padding}${fence}`;
}
