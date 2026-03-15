import { TrigLexer, TrigParser } from '@faubulous/mentor-rdf-parsers';
import { startBrowserLanguageServer } from '../start-language-server.browser';

startBrowserLanguageServer('trig', 'TriG', new TrigLexer(), new TrigParser());
