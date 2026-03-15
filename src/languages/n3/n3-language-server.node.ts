import { N3Lexer, N3Parser } from '@faubulous/mentor-rdf-parsers';
import { startNodeLanguageServer } from '../start-language-server.node';

startNodeLanguageServer('n3', 'N3', new N3Lexer(), new N3Parser());
