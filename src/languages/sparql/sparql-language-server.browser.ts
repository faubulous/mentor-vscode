import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { SparqlLanguageServer } from './sparql-language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));
new SparqlLanguageServer(connection).start();
