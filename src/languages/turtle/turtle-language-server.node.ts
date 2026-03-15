import { TurtleLexer, TurtleParser } from '@faubulous/mentor-rdf-parsers';
import { startNodeLanguageServer } from '../start-language-server.node';

startNodeLanguageServer('turtle', 'Turtle', new TurtleLexer(), new TurtleParser());
