import { SparqlResultsContextType } from './sparql-results-context';
import { useSparqlResults } from './sparql-results-provider';

/**
 * Higher-Order Component (HOC) for injecting SPARQL results context into a wrapped component.
 * This is useful when you want to provide SPARQL query results and related state to components
 * that are not direct children of the SparqlResultsProvider, or when you want to decouple
 * context consumption from component hierarchy. By using this HOC, any component can access
 * the SPARQL results context via a prop, enabling easier reuse and testing.
 *
 * @param Component The React component to wrap.
 * @returns A new component with the sparqlResults prop injected from context.
 */
export function withSparqlResults<P extends object>(
    Component: React.ComponentType<P & { sparqlResults: SparqlResultsContextType }>
) {
    return function WrappedComponent(props: P) {
        const sparqlResults = useSparqlResults();
		
        return <Component {...props} sparqlResults={sparqlResults} />;
    };
}