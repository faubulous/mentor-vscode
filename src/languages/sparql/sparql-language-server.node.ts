import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { SparqlLanguageServer } from './sparql-language-server';

const connection = createConnection(ProposedFeatures.all);

new SparqlLanguageServer(connection).start();
