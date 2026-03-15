import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { XmlLanguageServer } from './xml-language-server';

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));
new XmlLanguageServer(connection).start();
