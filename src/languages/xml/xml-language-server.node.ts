import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { XmlLanguageServer } from './xml-language-server';

const connection = createConnection(ProposedFeatures.all);
new XmlLanguageServer(connection).start();
