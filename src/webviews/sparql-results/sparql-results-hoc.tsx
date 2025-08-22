import { useSparqlResults } from './sparql-results-context';
import { SparqlResultsContextType } from './sparql-results-context';

/**
 * Higher-order component to inject SPARQL results context into a component.
 * @param Component The component to wrap.
 * @returns A wrapped component with SPARQL results context.
 */
export function withSparqlResults<P extends object>(
    Component: React.ComponentType<P & { sparqlResults: SparqlResultsContextType }>
) {
    return function WrappedComponent(props: P) {
        const sparqlResults = useSparqlResults();
		
        return <Component {...props} sparqlResults={sparqlResults} />;
    };
}