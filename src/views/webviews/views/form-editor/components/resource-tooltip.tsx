import { useLayoutEffect, useMemo, useRef } from 'react';
import { Term } from '@rdfjs/types';
import { ResourceSummary } from '../form-editor-model';
import { useHoveredElement } from '../hooks/use-hovered-element';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { CompactResourceCard } from './compact-resource-card';

/**
 * How long the pointer rests on a resource before its tooltip shows, in milliseconds.
 */
const HOVER_DELAY = 400;

/**
 * The gap between the tooltip and the element it belongs to, in pixels.
 */
const TOOLTIP_GAP = 2;

/**
 * The least room the tooltip keeps from the edges of the view, in pixels.
 */
const VIEW_MARGIN = 8;

/**
 * The attributes that mark an element as a resource the tooltip tells.
 */
export interface ResourceTooltipAttributes {
	/**
	 * The IRI of the resource.
	 */
	'data-tooltip-iri'?: string;

	/**
	 * Set where the tooltip is anchored to the right edge of the element, as for a datatype label at
	 * the end of a field.
	 */
	'data-tooltip-anchor'?: 'end';
}

/**
 * Properties of the {@link ResourceTooltip} component.
 */
export interface ResourceTooltipProps {
	/**
	 * Supplies the statements of the resources, which their compact cards show.
	 */
	dataService: IResourceDataService;
}

/**
 * Mark an element as a resource the tooltip tells. A blank node or a literal is not marked.
 * @param term The term, if there is one.
 * @param anchor Set to `end` to anchor the tooltip to the right edge of the element.
 * @returns The attributes to spread on the element.
 */
export function getResourceTooltipAttributes(term: Term | undefined, anchor?: 'end'): ResourceTooltipAttributes {
	if (term?.termType !== 'NamedNode') {
		return {};
	}

	return anchor ? { 'data-tooltip-iri': term.value, 'data-tooltip-anchor': anchor } : { 'data-tooltip-iri': term.value };
}

/**
 * The tooltip of the resource the pointer rests on: the compact card of a resource of the
 * document, else the IRI. It stands under the element, at least as wide, from its left edge or,
 * where the element asks for it, its right edge, and above the element where the view has no room
 * under it. Any element marked with {@link getResourceTooltipAttributes} is a resource; pressing a
 * key or a button, scrolling and leaving the element hide the tooltip, which never takes the
 * pointer.
 * @param props Where the statements of the resources come from.
 * @returns The tooltip, or nothing while no resource is hovered.
 */
export function ResourceTooltip({ dataService }: ResourceTooltipProps): React.JSX.Element | null {
	const { resources } = useFormEditorContext();
	const summaries = useMemo(() => _summariesByIri(resources ?? []), [resources]);
	const element = useHoveredElement('[data-tooltip-iri]', HOVER_DELAY);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const iri = element?.getAttribute('data-tooltip-iri') ?? undefined;
	const summary = iri ? summaries.get(iri) : undefined;

	useLayoutEffect(() => {
		const tooltip = tooltipRef.current;

		if (!tooltip || !element) {
			return undefined;
		}

		const observer = new ResizeObserver(() => _place(tooltip, element));

		_place(tooltip, element);
		observer.observe(tooltip);

		return () => observer.disconnect();
	}, [element]);

	if (!element || !iri) {
		return null;
	}

	return (
		<div ref={tooltipRef} className={`resource-tooltip${summary ? ' is-card' : ''}`} role="tooltip">
			{summary ? <CompactResourceCard summary={summary} dataService={dataService} /> : <div className="resource-tooltip-iri">{iri}</div>}
		</div>
	);
}

/**
 * Index the resources of the document by their IRIs.
 * @param resources The resources.
 * @returns The resources with an IRI, by it.
 */
function _summariesByIri(resources: readonly ResourceSummary[]): Map<string, ResourceSummary> {
	return new Map(resources.flatMap(resource => resource.term.termType === 'NamedNode' ? [[resource.term.value, resource] as const] : []));
}

/**
 * Place the tooltip by its element: under it, or above it where the view has no room under it,
 * from its left edge, or its right edge where the element asks for it, inside the view.
 * @param tooltip The tooltip.
 * @param element The element it belongs to.
 */
function _place(tooltip: HTMLElement, element: Element): void {
	const bounds = element.getBoundingClientRect();
	const viewWidth = document.documentElement.clientWidth;
	const viewHeight = document.documentElement.clientHeight;
	const width = tooltip.offsetWidth;
	const height = tooltip.offsetHeight;
	const preferredLeft = element.getAttribute('data-tooltip-anchor') === 'end' ? bounds.right - Math.max(width, bounds.width) : bounds.left;
	const below = bounds.bottom + TOOLTIP_GAP;
	const fitsBelow = below + height <= viewHeight - VIEW_MARGIN || bounds.top - TOOLTIP_GAP - height < VIEW_MARGIN;

	tooltip.style.minWidth = `${bounds.width}px`;
	tooltip.style.top = `${fitsBelow ? below : bounds.top - TOOLTIP_GAP - height}px`;
	tooltip.style.left = `${Math.max(VIEW_MARGIN, Math.min(preferredLeft, viewWidth - VIEW_MARGIN - width))}px`;
}
