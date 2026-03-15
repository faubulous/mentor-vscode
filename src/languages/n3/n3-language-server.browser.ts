import { N3Lexer, N3Parser } from '@faubulous/mentor-rdf-parsers';
import { startBrowserLanguageServer } from '../start-language-server.browser';

startBrowserLanguageServer('n3', 'N3', new N3Lexer(), new N3Parser());
