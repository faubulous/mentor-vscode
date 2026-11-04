import { NamedNode } from '@rdfjs/types';
import { useState } from 'react';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { EditedRow } from './edited-row';
import { ResourceValues } from './resource-values';

/**
 * Properties of the {@link DraftResourceCard} component.
 */
export interface DraftResourceCardProps {
	/**
	 * The type chosen for the node, if any.
	 */
	type?: NamedNode;

	/**
	 * The index of the node among the values of its row.
	 */
	index: number;

	/**
	 * The row that started the node.
	 */
	edited: EditedRow;
}

/**
 * A new blank node in the row that started it: a nested card whose header asks for the type, with
 * the input taking the focus when the card appears and offering the classes of the document. The
 * node is written with the row once its type is chosen; leaving the row without one, or Escape,
 * drops it.
 * @param props The node and its row.
 * @returns The card.
 */
export function DraftResourceCard({ type, index, edited }: DraftResourceCardProps): React.JSX.Element {
	const { editor, services } = edited;
	const [text, setText] = useState('');
	const types = type ? [{ view: services.resolver.viewOf(type), index: 0 }] : [];

	const choose = (term: NamedNode): void => {
		editor.setNodeType(index, term);
		setText('');
	};

	const handleCreate = (): void => {
		const reading = services.reader.readValue(text, 'resource');

		if (reading?.term?.termType === 'NamedNode') {
			choose(reading.term);
		}
	};

	return (
		<div className="resource-card is-nested is-draft" data-value-index={index}>
			<div className="statement-list is-editable">
				<div className="nested-card-header" role="group" aria-label="New blank node">
					<span className="statement-gutter"></span>
					<span className="statement-predicate" title={RDF.type}>type</span>
					<span className="statement-values">
						<span className="statement-value is-adder">
							<ResourceValues
								resources={types}
								documentResources={services.classes}
								range="resource"
								pendingText={text}
								services={services}
								placeholder="Choose type"
								onPendingInput={setText}
								onPick={term => term.termType === 'NamedNode' && choose(term)}
								onCreate={handleCreate}
								onRemove={() => editor.setNodeType(index, undefined)}
								autoFocus
							/>
						</span>
					</span>
					<span className="statement-actions">
						<button type="button" className="statement-row-remove" aria-label="Remove new blank node" title="Remove" onClick={() => editor.removeValue(index)}>
							<vscode-icon name="close" size={12}></vscode-icon>
						</button>
					</span>
				</div>
			</div>
		</div>
	);
}
