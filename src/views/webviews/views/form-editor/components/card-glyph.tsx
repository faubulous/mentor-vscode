import { ResourceIcon } from './resource-icon';

/**
 * Properties of the {@link CardGlyph} component.
 */
export interface CardGlyphProps {
	/**
	 * The name of the icon of the kind of the resource.
	 */
	iconName: string;

	/**
	 * Whether the card is expanded, which the chevron points to.
	 */
	expanded: boolean;
}

/**
 * The glyph in the gutter of a card: at rest the icon of the kind of the resource in its colour,
 * and on hover or focus of the card's leading row the chevron that collapses or expands the card.
 * @param props The icon and whether the card is expanded.
 * @returns The glyph.
 */
export function CardGlyph({ iconName, expanded }: CardGlyphProps): React.JSX.Element {
	return (
		<span className="card-glyph" aria-hidden="true">
			<span className="card-glyph-kind"><ResourceIcon iconName={iconName} /></span>
			<vscode-icon className="card-glyph-chevron" name={expanded ? 'chevron-down' : 'chevron-right'} size={16}></vscode-icon>
		</span>
	);
}
