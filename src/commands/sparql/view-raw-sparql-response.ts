import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlQueryService } from '@src/languages/sparql/services';
import { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import { IDocumentFactory } from '@src/services/document/document-factory.interface';

/**
 * Lets the user pick one of the executed queries that captured a raw response.
 * @param candidates The executions that have a raw response, most recent first.
 * @returns The selected execution, or `undefined` if the user dismissed the picker.
 */
async function pickQueryExecution(candidates: SparqlQueryExecutionState[]): Promise<SparqlQueryExecutionState | undefined> {
    if (candidates.length === 1) {
        return candidates[0];
    }

    const items = candidates.map(state => ({
        label: state.label ?? state.query?.split('\n')[0] ?? state.id,
        description: state.connectionName,
        detail: new Date(state.startTime).toLocaleTimeString(),
        state
    }));

    const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select a query execution' });

    return selected?.state;
}

export const viewRawSparqlResponse = {
    id: 'mentor.command.viewRawSparqlResponse',
    handler: async (queryId?: string): Promise<void> => {
        const queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);
        const history = queryService.getQueryHistory();

        const candidates = queryId
            ? history.filter(state => state.id === queryId)
            : [...history].filter(state => state.rawResponse).reverse();

        if (candidates.length === 0) {
            vscode.window.showInformationMessage('No raw response is available. Run a query first.');
            return;
        }

        const queryState = await pickQueryExecution(candidates);
        const rawResponse = queryState?.rawResponse;

        if (!rawResponse) {
            if (queryState) {
                vscode.window.showInformationMessage('No raw response is available for this query.');
            }

            return;
        }

        let language = 'plaintext';

        if (rawResponse.contentType) {
            const documentFactory = container.resolve<IDocumentFactory>(ServiceToken.DocumentFactory);

            language = await documentFactory.getLanguageIdFromMimeType(rawResponse.contentType);
        }

        const document = await vscode.workspace.openTextDocument({ content: rawResponse.body, language });

        await vscode.window.showTextDocument(document);
    }
};
