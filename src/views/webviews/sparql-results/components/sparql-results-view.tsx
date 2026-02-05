import { useStylesheet } from '@src/views/webviews/webview-hooks';
import { useWebviewMessaging } from '@src/views/webviews/webview-hooks';
import { WebviewMessaging } from '@src/views/webviews/webview-messaging';
import { BooleanResult } from '@src/services/sparql-query-state';
import { SparqlQueryExecutionState } from '@src/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { SparqlResultsProvider } from '../helpers/sparql-results-provider';
import { SparqlResultsToolbar } from './sparql-results-toolbar';
import { SparqlResultsBindingsTable } from './bindings-table';
import stylesheet from './sparql-results-view.css';

/**
 * Properties for the SPARQL results table component.
 */
interface SparqlResultsViewProps {
  /**
   * The SPARQL query results to display.
   */
  queryContext: SparqlQueryExecutionState;

  /**
   * The default maximum number of items to display in the bindings table.
   */
  defaultPageSize: number;

  /**
   * Optional messaging instance (passed when used as child component).
   */
  messaging?: WebviewMessaging<SparqlResultsWebviewMessages>;
}

/**
 * Component to display the results of a SPARQL query, either as a boolean or bindings table.
 */
export function SparqlResultsView({ queryContext, defaultPageSize, messaging: propMessaging }: SparqlResultsViewProps) {
  // Use provided messaging or create our own
  const hookMessaging = useWebviewMessaging<SparqlResultsWebviewMessages>();
  const messaging = propMessaging ?? hookMessaging;

  // Add stylesheets
  useStylesheet('sparql-results-view-styles', stylesheet);

  const renderExecuting = () => (
    <div className="sparql-results-container loading">
      <SparqlResultsToolbar />
      <div className="sparql-results-content-container">
      </div>
    </div>
  );

  const renderError = () => (
    <div className="sparql-results-container error">
      <SparqlResultsToolbar />
      <div className="sparql-results-content-container">
        {!queryContext.error?.cancelled &&
          <pre>
            {queryContext.error?.stack || 'No stack trace available.'}
          </pre>
        }
        {queryContext.error?.cancelled &&
          <div className="sparql-results-cancelled-message text-muted">
            <span className="codicon codicon-circle-slash"></span>
            Query execution was cancelled.
          </div>
        }
      </div>
    </div>
  );

  const renderBooleanResult = (result: BooleanResult) => (
    <div className="sparql-results-container success">
      <SparqlResultsToolbar />
      {result.value ?
        (<div className="sparql-results-content-container codicon-xl true">
          <div className='result'>
            <span className="codicon codicon-pass-filled"></span> True
          </div>
        </div>) :
        (<div className="sparql-results-content-container codicon-xl false">
          <div className='result'>
            <span className="codicon codicon-error"></span> False
          </div>
        </div>)
      }
    </div>
  );

  const renderBindingsResult = () => (
    <div className="sparql-results-container success">
      <SparqlResultsToolbar />
      <SparqlResultsBindingsTable />
    </div>
  );

  const renderUnknownResultType = () => (
    <div className="sparql-results-container">
      <SparqlResultsToolbar />
      <div className="sparql-results-content-container">
        Unknown or unsupported result type: {queryContext.result?.type}
      </div>
    </div>
  );

  const renderNoResult = () => (
    <div className="sparql-results-container">
      <SparqlResultsToolbar />
      <div className="sparql-results-content-container">
        The query did not return any results.
      </div>
    </div>
  );

  const renderContent = () => {
    if (queryContext.error) {
      return renderError();
    } else if (queryContext.startTime && !queryContext.endTime) {
      return renderExecuting();
    } else if (queryContext.result?.type === 'boolean') {
      return renderBooleanResult(queryContext.result);
    } else if (queryContext.result?.type === 'bindings') {
      return renderBindingsResult();
    } else if (queryContext.result?.type) {
      return renderUnknownResultType();
    } else {
      return renderNoResult();
    }
  };

  return (
    <SparqlResultsProvider
      queryContext={queryContext}
      messaging={messaging}
      defaultPageSize={defaultPageSize}>
      {renderContent()}
    </SparqlResultsProvider>
  );
}