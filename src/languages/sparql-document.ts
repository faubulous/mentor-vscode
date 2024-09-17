import { IToken } from 'millan';
import { SparqlSyntaxParser } from '@faubulous/mentor-rdf';
import { DocumentContext } from '../document-context';

export class SparqlDocument extends DocumentContext {
	protected tokenize(data: string): IToken[] {
		return new SparqlSyntaxParser().tokenize(data);
	}
}