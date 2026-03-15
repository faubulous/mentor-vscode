import { TrigLexer, TrigParser } from '@faubulous/mentor-rdf-parsers';
import { startNodeLanguageServer } from '../start-language-server.node';

startNodeLanguageServer('trig', 'TriG', new TrigLexer(), new TrigParser());
