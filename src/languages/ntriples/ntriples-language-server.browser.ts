import { NTriplesLexer, NTriplesParser } from '@faubulous/mentor-rdf-parsers';
import { startBrowserLanguageServer } from '../start-language-server.browser';

startBrowserLanguageServer('ntriples', 'N-Triples', new NTriplesLexer(), new NTriplesParser());
