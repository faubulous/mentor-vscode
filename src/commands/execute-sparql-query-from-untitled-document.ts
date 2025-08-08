import { restoreUntitledDocument } from './restore-untitled-document';
import { executeSparqlQueryFromDocument } from './execute-sparql-query-from-document';

export async function executeSparqlQueryFromUntitledDocument(documentIri: string, query: string): Promise<void> {
    // Note: These commands need to be run in sequence to ensure 
    // the document is restored before executing the query.
    const restoredIri = await restoreUntitledDocument(documentIri, query);

    // The restored document may have a different IRI if it was not previously opened.
    if (restoredIri) {
        executeSparqlQueryFromDocument(restoredIri);
    }
}