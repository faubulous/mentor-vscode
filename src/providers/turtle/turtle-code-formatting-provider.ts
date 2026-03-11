import * as vscode from 'vscode';
import { TurtleFormatter } from '@faubulous/mentor-rdf-serializers';
import { getConfig } from '@src/utilities/config';

export class TurtleCodeFormattingProvider implements vscode.DocumentFormattingEditProvider {
    private _formatter = new TurtleFormatter();

    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): vscode.TextEdit[] {
        const config = getConfig('formatting.turtle');

        const text = document.getText();
        const result = this._formatter.formatFromText(text, {
            indent: options.insertSpaces ? ' '.repeat(options.tabSize) : '\t',
            prettyPrint: true,
            maxLineWidth: config.get('maxLineWidth', 120),
            spaceBeforePunctuation: config.get('spaceBeforePunctuation', true),
            blankLinesBetweenSubjects: config.get('blankLinesBetweenSubjects', true),
        });

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, result.output)];
    }
}