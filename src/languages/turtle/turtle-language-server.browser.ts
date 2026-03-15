import { TurtleLexer, TurtleParser } from '@faubulous/mentor-rdf-parsers';
import { startBrowserLanguageServer } from '../start-language-server.browser';

startBrowserLanguageServer('turtle', 'Turtle', new TurtleLexer(), new TurtleParser());
