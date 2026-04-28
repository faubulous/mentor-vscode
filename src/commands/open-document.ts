import * as vscode from 'vscode';

export const openDocument = {
    id: 'mentor.command.openDocument',
    handler: async (documentIri: string, query?: string) => {
        if (!documentIri && query) {
            const document = await vscode.workspace.openTextDocument({
                content: query,
                language: 'sparql'
            });

            await vscode.window.showTextDocument(document);
            return;
        }

        if (!documentIri) {
            vscode.window.showErrorMessage('No document IRI provided.');
            return;
        }

        try {
            const uri = vscode.Uri.parse(documentIri);

            // For closed untitled documents fall back to opening a new editor with the
            // query text, because the buffer no longer exists in VS Code's memory.
            if (uri.scheme === 'untitled' && query) {
                const isOpen = vscode.workspace.textDocuments.some(d => d.uri.toString() === documentIri);

                if (!isOpen) {
                    const document = await vscode.workspace.openTextDocument({
                        content: query,
                        language: 'sparql'
                    });

                    await vscode.window.showTextDocument(document);
                    return;
                }
            }

            if (uri.scheme === 'vscode-notebook-cell') {
                // Get the notebook URI (remove the cell fragment)
                const notebookUri = uri.with({ scheme: 'file', fragment: '' });

                const notebook = await vscode.workspace.openNotebookDocument(notebookUri);
                const notebookEditor = await vscode.window.showNotebookDocument(notebook);

                const cell = notebookEditor.notebook.getCells().find(c => c.document.uri.toString() === uri.toString());

                if (cell) {
                    const range = new vscode.NotebookRange(cell.index, cell.index + 1);

                    notebookEditor.revealRange(range, vscode.NotebookEditorRevealType.Default);
                }
            } else {
                const document = await vscode.workspace.openTextDocument(uri);

                await vscode.window.showTextDocument(document);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open document: ${error.message}`);
        }
    }
};