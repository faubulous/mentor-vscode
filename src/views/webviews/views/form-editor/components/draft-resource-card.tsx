import { NamedNode } from '@rdfjs/types';
import { useState } from 'react';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceOptionData } from '../form-editor-model';
import { EditedRow } from './edited-row';
import { getResourceTooltipAttributes } from './resource-tooltip';
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
 * the input taking the focus when the card appears and offering the classes of the workspace. The
 * node is written with the row once its type is chosen; leaving the row without one, or Escape,
 * drops it.
 * @param props The node and its row.
 * @returns The card.
 */
export function DraftResourceCard({ type, index, edited }: DraftResourceCardProps): React.JSX.Element {
	const { editor, services } = edited;
	const [text, setText] = useState('');
	const types = type ? [{ view: services.resolver.viewOf(type), index: 0 }] : [];

	const handlePick = (option: ResourceOptionData): void => {
		editor.pickNodeType(index, option);
		setText('');
	};

	const handleCreate = (): void => {
		const reading = services.reader.readIri(text);

		if (reading.term) {
			editor.setNodeType(index, reading.term);
			setText('');
		}
	};

	return (
		<div className="resource-card is-nested is-draft" data-value-index={index}>
			<div className="statement-list is-editable">
				<div className="nested-card-header" role="group" aria-label="New blank node">
					<span className="row-gutter is-start"></span>
					<div className="statement-cells">
						<span className="statement-predicate" {...getResourceTooltipAttributes(RdfDataFactory.namedNode(RDF.type))}>type</span>
						<span className="statement-values">
							<span className="statement-value is-adder">
								<ResourceValues
									resources={types}
									targetType="class"
									pendingText={text}
									placeholder="Choose type"
									onPendingInput={setText}
									onPick={handlePick}
									onCreate={handleCreate}
									onRemove={() => editor.setNodeType(index, undefined)}
									autoFocus
								/>
							</span>
						</span>
					</div>
					<span className="row-gutter is-end statement-actions">
						<button type="button" className="statement-row-remove" aria-label="Remove new blank node" title="Remove" onClick={() => editor.removeValue(index)}>
							<vscode-icon name="close" size={12}></vscode-icon>
						</button>
					</span>
				</div>
			</div>
		</div>
	);
}
