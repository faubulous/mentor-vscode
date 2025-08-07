import * as vscode from 'vscode';
import { NOTEBOOK_TYPE } from './notebook-controller';

interface NotebookData {
	cells: NotebookCell[]
}

interface NotebookCell {
	language: string;
	value: string;
	kind: vscode.NotebookCellKind;
	editable?: boolean;
}

export class NotebookSerializer implements vscode.NotebookSerializer {

	public readonly label: string = 'Mentor Notebook Serializer';

	public async deserializeNotebook(data: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
		const contents = new TextDecoder().decode(data);

		let raw: NotebookData;

		try {
			raw = JSON.parse(contents);
		} catch {
			raw = { cells: [] };
		}

		const cells = raw.cells.map(item => new vscode.NotebookCellData(
			item.kind,
			item.value,
			item.language
		));

		return new vscode.NotebookData(cells);
	}

	public async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
		const contents: NotebookData = { cells: [] };

		for (const cell of data.cells) {
			contents.cells.push({
				kind: cell.kind,
				language: cell.languageId,
				value: cell.value
			});
		}

		return new TextEncoder().encode(JSON.stringify(contents));
	}

	public register(): vscode.Disposable {
		return vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, this, { transientOutputs: true });
	}
}