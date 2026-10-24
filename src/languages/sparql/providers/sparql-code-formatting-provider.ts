import * as vscode from 'vscode';
import { SparqlFormatter } from '@faubulous/mentor-rdf-serializers';
import { getConfig, resolveFormattingConfig, resolveFormattingIndent } from '@src/utilities/vscode/config';

/**
 * Provides formatting edits for SPARQL documents in VS Code.
 */
export class SparqlCodeFormattingProvider implements vscode.DocumentFormattingEditProvider {
    /**
     * The formatter, created on first use: it builds a SPARQL lexer, which would
     * otherwise run when the extension is activated.
     */
    private _formatter: SparqlFormatter | undefined;

    /**
     * Returns the formatter, creating it on first use.
     */
    private _getFormatter(): SparqlFormatter {
        this._formatter ??= new SparqlFormatter();

        return this._formatter;
    }

    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): vscode.TextEdit[] {
        const text = document.getText();
        const config = getConfig('formatting.sparql');

        const result = this._getFormatter().formatFromText(text, {
            indent: resolveFormattingIndent(document, options),
            prettyPrint: true,
            uppercaseKeywords: config.get('uppercaseKeywords', false),
            alignPatterns: config.get('alignPatterns', true),
            sameBraceLine: config.get('sameBraceLine', true),
            separateClauses: config.get('separateClauses', true),
            maxLineWidth: resolveFormattingConfig('sparql', 'maxLineWidth', 120),
            spaceBeforePunctuation: resolveFormattingConfig('sparql', 'spaceBeforePunctuation', true),
            blankLinesBetweenSubjects: resolveFormattingConfig('sparql', 'blankLinesBetweenSubjects', true),
        });

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, result.output)];
    }
}