import { NQuadsLexer, NQuadsParser } from '@faubulous/mentor-rdf-parsers';
import { startNodeLanguageServer } from '../start-language-server.node';

startNodeLanguageServer('nquads', 'N-Quads', new NQuadsLexer(), new NQuadsParser());
