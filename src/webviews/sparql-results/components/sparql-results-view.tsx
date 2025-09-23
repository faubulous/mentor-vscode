import { WebviewComponent } from '@/webviews/webview-component';
import { WebviewMessaging } from '@/webviews/webview-messaging';
import { BindingsResult, BooleanResult } from '@/services/sparql-query-state';
import { SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from '../sparql-results-messages';
import { SparqlResultsProvider } from '../helpers/sparql-results-provider';
import { SparqlResultsToolbar } from './sparql-results-toolbar';
import { SparqlResultsBindingsTable } from './bindings-table';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-view.css';

/**
 * Properties for the SPARQL results table component.
 */
interface SparqlResultsViewProps {
  /**
   * Messaging used for communication with the extension host.
   */
  messaging: WebviewMessaging<SparqlResultsWebviewMessages>;

  /**
   * The SPARQL query results to display.
   */
  queryContext: SparqlQueryExecutionState;

  /**
   * The default maximum number of items to display in the bindings table.
   */
  defaultPageSize: number;
}

/**
 * Component to display the results of a SPARQL query, either as a boolean or bindings table.
 */
export class SparqlResultsView extends WebviewComponent<
  SparqlResultsViewProps,
  {},
  SparqlResultsWebviewMessages
> {
  constructor(props: SparqlResultsViewProps) {
    super(props);

    this.messaging = props.messaging;
  }

  componentDidMount() {
    super.componentDidMount();

    this.addStylesheet('codicon-styles', codicons);
    this.addStylesheet('mentor-sparql-table-styles', stylesheet);
  }

  render() {
    const context = this.props.queryContext;

    return (
      <SparqlResultsProvider
        queryContext={context}
        messaging={this.props.messaging}
        defaultPageSize={this.props.defaultPageSize}>
        {this._renderContent()}
      </SparqlResultsProvider>
    );
  }

  private _renderContent() {
    const context = this.props.queryContext;

    if (context.error) {
      return this._renderError();
    } else if (context.startTime && !context.endTime) {
      return this._renderExecuting();
    } else if (context.result?.type === 'boolean') {
      return this._renderBooleanResult(context.result);
    } else if (context.result?.type === 'bindings') {
      return this._renderBindingsResult(context.result);
    } else if (context.result) {
      return this._renderUnknownResultType(context);
    } else {
      return this._renderNoResult();
    }
  }

  private _renderExecuting() {
    return (
      <div className="sparql-results-container loading">
        <SparqlResultsToolbar />
        <div className="sparql-results-content-container">
        </div>
      </div>
    );
  }

  private _renderError() {
    return (
      <div className="sparql-results-container error">
        <SparqlResultsToolbar />
        <div className="sparql-results-content-container">
          <pre>{this.props.queryContext.error?.stack || 'No stack trace available.'}</pre>
        </div>
      </div>
    );
  }

  private _renderBooleanResult(result: BooleanResult) {
    return (
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
  }

  private _renderBindingsResult(result: BindingsResult) {
    return (
      <div className="sparql-results-container success">
        <SparqlResultsToolbar />
        <SparqlResultsBindingsTable />
      </div>
    );
  }

  private _renderUnknownResultType(context: SparqlQueryExecutionState) {
    return (
      <div className="sparql-results-container">
        <SparqlResultsToolbar />
        <div className="sparql-results-content-container">
          Unknown or unsupported result type: {context.result?.type}
        </div>
      </div>
    );
  }

  private _renderNoResult() {
    return (
      <div className="sparql-results-container">
        <SparqlResultsToolbar />
        <div className="sparql-results-content-container">
          No result available.
        </div>
      </div>
    );
  }
}