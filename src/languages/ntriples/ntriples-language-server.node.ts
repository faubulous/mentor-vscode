import { NTriplesLexer, NTriplesParser } from '@faubulous/mentor-rdf-parsers';
import { startNodeLanguageServer } from '../start-language-server.node';

startNodeLanguageServer('ntriples', 'N-Triples', new NTriplesLexer(), new NTriplesParser());
