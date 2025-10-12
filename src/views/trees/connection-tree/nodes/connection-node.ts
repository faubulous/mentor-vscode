import * as vscode from 'vscode';
import { SparqlConnection } from '@src/services/sparql-connection';
import { TreeNodeBase } from '@src/views/trees/tree-node';

/**
 * Represents a SPARQL connection in the connection tree.
 */
export class ConnectionNode extends TreeNodeBase {

	/**
	 * The SPARQL connection represented by this tree item.
	 */
	connection: SparqlConnection;

	constructor(connection: SparqlConnection) {
		super();

		this.id = connection.id;
		this.label = connection.endpointUrl;
		this.connection = connection;
	}

	/**
	 * Get the command that is executed when the tree item is clicked.
	 * @returns A command that is executed when the tree item is clicked.
	 */
	getCommand(): vscode.Command | undefined {
		return {
			title: '',
			command: 'mentor.command.editSparqlConnection',
			arguments: [this.connection, true]
		};
	}

	/**
	 * Get a value that can be accessed in `package.json` for the context menu.
	 * @returns A string that represents the context value of the tree item.
	 */
	getContextValue(): string {
		return 'connection';
	}

	/**
	 * Get the label of the tree item.
	 * @returns The label of the tree item.
	 */
	getLabel(): vscode.TreeItemLabel {
		return { label: this.label };
	}

	/**
	 * Get the description of the tree item.
	 * @returns A description string or `undefined` if no description should be shown.
	 */
	getDescription(): string {
		if (this.connection?.isModified) {
			return 'Unsaved';
		} else {
			return '';
		}
	}

	/**
	 * Get the icon of the tree item.
	 * @returns A theme icon, a file system path or undefined if no icon should be shown.
	 */
	getIcon(): vscode.ThemeIcon | undefined {
		return new vscode.ThemeIcon('database', this.getIconColor());
	}
}