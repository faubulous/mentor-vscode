import * as vscode from 'vscode';
import { TurtleFormatter } from '@faubulous/mentor-rdf-serializers';
import { resolveFormattingConfig, resolveFormattingIndent } from '@src/utilities/vscode/config';

/**
 * Provides formatting edits for Turtle documents using the TurtleFormatter.
 */
export class TurtleCodeFormattingProvider implements vscode.DocumentFormattingEditProvider {
    /**
     * The TurtleFormatter instance used to format Turtle documents.
     */
    private _formatter = new TurtleFormatter();

    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const text = document.getText();
        const result = this._formatter.formatFromText(text, {
            indent: resolveFormattingIndent(document, options),
            prettyPrint: true,
            maxLineWidth: resolveFormattingConfig('turtle', 'maxLineWidth', 120),
            spaceBeforePunctuation: resolveFormattingConfig('turtle', 'spaceBeforePunctuation', true),
            blankLinesBetweenSubjects: resolveFormattingConfig('turtle', 'blankLinesBetweenSubjects', true),
        });

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, result.output)];
    }
}