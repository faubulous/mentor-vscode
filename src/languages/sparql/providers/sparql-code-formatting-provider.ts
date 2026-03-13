import * as vscode from 'vscode';
import { SparqlFormatter } from '@faubulous/mentor-rdf-serializers';
import { getConfig } from '@src/utilities/config';

export class SparqlCodeFormattingProvider implements vscode.DocumentFormattingEditProvider {
    private _formatter = new SparqlFormatter();

    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const config = getConfig('formatting.sparql');

        const text = document.getText();
        const result = this._formatter.formatFromText(text, {
            indent: options.insertSpaces ? ' '.repeat(options.tabSize) : '\t',
            prettyPrint: true,
            uppercaseKeywords: config.get('uppercaseKeywords', true),
            alignPatterns: config.get('alignPatterns', true),
            sameBraceLine: config.get('sameBraceLine', true),
            separateClauses: config.get('separateClauses', true),
            maxLineWidth: config.get('maxLineWidth', 120),
            spaceBeforePunctuation: config.get('spaceBeforePunctuation', true),
        });

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, result.output)];
    }
}