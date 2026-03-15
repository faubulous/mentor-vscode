import { NQuadsLexer, NQuadsParser } from '@faubulous/mentor-rdf-parsers';
import { startBrowserLanguageServer } from '../start-language-server.browser';

startBrowserLanguageServer('nquads', 'N-Quads', new NQuadsLexer(), new NQuadsParser());
