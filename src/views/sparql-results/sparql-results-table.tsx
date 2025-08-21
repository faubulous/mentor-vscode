import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { WebviewComponent } from '@/views/webview-component';
import { WebviewMessaging } from '@/views/webview-messaging';
import { BindingsResult, BooleanResult } from '@/services/sparql-query-state';
import { SparqlQueryExecutionState } from '@/services/sparql-query-state';
import { SparqlResultsWebviewMessages } from './sparql-results-webview-messages';
import { Stopwatch } from './stopwatch';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-table.css';

/**
 * Properties for the SPARQL results table component.
 */
interface SparqlResultsTableProps {
  /**
   * Messaging used for communication with the extension host.
   */
  messaging: WebviewMessaging<SparqlResultsWebviewMessages>;

  /**
   * The SPARQL query results to display.
   */
  queryContext: SparqlQueryExecutionState;
}

/**
 * State for the SPARQL results table component.
 */
interface SparqlResultsTableState {
  pageSize: number;

  currentPage: number;
}

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsTable extends WebviewComponent<
  SparqlResultsTableProps,
  SparqlResultsTableState,
  SparqlResultsWebviewMessages
> {

  pageSizeOptions = [100, 500, 1000, 2000, 5000];

  state = {
    pageSize: 500,
    currentPage: 0
  };

  constructor(props: SparqlResultsTableProps) {
    super(props);

    this.messaging = props.messaging;
  }

  componentDidMount() {
    super.componentDidMount();

    this.addStylesheet('codicon-styles', codicons);
    this.addStylesheet('sparql-table-styles', stylesheet);
  }

  render() {
    const context = this.props.queryContext;

    if (context.error) {
      return this._renderError();
    } else if (context.startTime && !context.endTime) {
      return this._renderExecuting();
    } else if (context.result) {
      const result = context.result;

      if (result.type === 'boolean') {
        return this._renderBooleanResult();
      } else if (result.type === 'bindings') {
        return this._renderBindingsResult();
      } else {
        return (<div>Unknown or unsupported result type: {result.type}</div>);
      }
    } else {
      return (<div>Query did not return a result.</div>);
    }
  }

  private _renderExecuting() {
    return (
      <div className="sparql-results-container loading">
        <vscode-toolbar-container className="sparql-results-toolbar">
          <Stopwatch queryContext={this.props.queryContext} />
          <span className="divider divider-vertical" style={{ marginLeft: '6px' }}></span>
          <vscode-toolbar-button title="Cancel">
            <span className="codicon codicon-debug-stop"></span>
          </vscode-toolbar-button>
          <span className="divider divider-vertical"></span>
          <span className="codicon codicon-sync codicon-modifier-spin"></span>
          <span>Executing...</span>
        </vscode-toolbar-container>
        <div className="sparql-results-content-container">
        </div>
      </div>
    );
  }

  private _renderError() {
    return (
      <div className="sparql-results-container error">
        <vscode-toolbar-container className="sparql-results-toolbar">
          <Stopwatch queryContext={this.props.queryContext} />
          <span className="divider divider-vertical" style={{ marginLeft: '6px' }}></span>
          <vscode-toolbar-button title="Reload" onClick={() => this._reloadQuery()}>
            <span className="codicon codicon-debug-restart"></span>
          </vscode-toolbar-button>
          <span className="divider divider-vertical"></span>
          <span className="codicon codicon-error"></span>
          <span>Error:</span>
        </vscode-toolbar-container>
        <div className="sparql-results-content-container">
          <pre>{this.props.queryContext.error?.stack || 'No stack trace available.'}</pre>
        </div>
      </div>
    );
  }

  private _renderBooleanResult() {
    const result = this.props.queryContext.result as BooleanResult;

    return (
      <div className="sparql-results-container success">
        <vscode-toolbar-container className="sparql-results-toolbar">
          <Stopwatch queryContext={this.props.queryContext} />
          <span className="divider divider-vertical" style={{ marginLeft: '6px' }}></span>
          <vscode-toolbar-button title="Reload" onClick={() => this._reloadQuery()}>
            <span className="codicon codicon-debug-restart"></span>
          </vscode-toolbar-button>
        </vscode-toolbar-container>
        {result.value ?
          (<div className="sparql-results-content-container codicon-xl true">
            <div className='result'>
              <span className="codicon codicon-pass-filled"></span> True
            </div>
          </div>) :
          (<div className="sparql-results-content-container codicon-xl false">
            <div className='result'>
              <span className="codicon codicon-error"></span> False</div>
          </div>)
        }
      </div>
    );
  }

  private _renderBindingsResult() {
    const result = this.props.queryContext.result as BindingsResult;
    const { pageSize, currentPage } = this.state;

    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, result.rows.length);
    const totalPages = Math.ceil(result.rows.length / pageSize);

    const range = {
      start: startIndex + 1,
      end: endIndex
    };

    return (
      <div className="sparql-results-container success">
        <vscode-toolbar-container className="sparql-results-toolbar">
          <Stopwatch queryContext={this.props.queryContext} />
          <span className="divider divider-vertical" style={{ marginLeft: '6px' }}></span>
          <vscode-toolbar-button title="Reload" onClick={() => this._reloadQuery()}>
            <span className="codicon codicon-debug-restart"></span>
          </vscode-toolbar-button>
          <span className="divider divider-vertical"></span>
          <select className="sparql-results-page-size-select"
            value={pageSize}
            onChange={this._handlePageSizeChange}
            disabled={result.rows.length <= pageSize}>
            {this.pageSizeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span className="divider divider-vertical"></span>
          <vscode-toolbar-button
            title="Previous page"
            onClick={() => this._previousPage()}
            disabled={currentPage === 0}
          >
            <span className="codicon codicon-chevron-left"></span>
          </vscode-toolbar-button>
          <vscode-toolbar-button
            title="Next page"
            onClick={() => this._nextPage()}
            disabled={currentPage >= totalPages - 1}
          >
            <span className="codicon codicon-chevron-right"></span>
          </vscode-toolbar-button>
          <span className="sparql-results-range">{range.start}-{range.end} of {result.rows.length} rows</span>
          <span className='divider divider-vertical'></span>
          <vscode-toolbar-button title="Save" onClick={() => this._saveResults()}>
            CSV
          </vscode-toolbar-button>
          <span className="spacer"></span>
        </vscode-toolbar-container>
        <vscode-table className="sparql-results-table" zebra bordered-rows resizable>
          <vscode-table-header>
            {result.columns.map(v => (
              <vscode-table-header-cell key={v}>{v}</vscode-table-header-cell>
            ))}
          </vscode-table-header>
          <vscode-table-body>
            {result.rows.slice(startIndex, endIndex).map((row, rowIndex) => (
              <vscode-table-row key={startIndex + rowIndex}>
                {result.columns.map(header => (
                  <vscode-table-cell key={`${startIndex + rowIndex}-${header}`}>
                    {this._renderCell(row[header], result.namespaceMap)}
                  </vscode-table-cell>
                ))}
              </vscode-table-row>
            ))}
          </vscode-table-body>
        </vscode-table>
      </div>
    );
  }

  private _renderCell(binding: Term | undefined, namespaceMap?: Record<string, string>) {
    switch (binding?.termType) {
      case 'NamedNode': {
        const namespaceIri = Uri.getNamespaceIri(binding.value);
        const prefix = namespaceMap ? namespaceMap[namespaceIri] : undefined;

        if (prefix) {
          const localName = binding.value.substring(namespaceIri.length);

          return (<pre><a href={binding.value}>{prefix}:<span className='label'>{localName}</span></a></pre>);
        } else {
          return (<pre><a href={binding.value}>{binding.value}</a></pre>);
        }
      }
      case 'BlankNode': {
        return (<pre>{binding.value}</pre>);
      }
      case 'Literal': {
        return (<pre>{binding.value}</pre>);
      }
      default: {
        return '';
      }
    }
  }

  private _handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const pageSize = parseInt(event.target.value, 10);

    this.setState({
      pageSize: pageSize,
      currentPage: 0
    });
  };

  private _nextPage = () => {
    const result = this.props.queryContext.result as BindingsResult;
    const { pageSize, currentPage } = this.state;
    const totalPages = Math.ceil(result.rows.length / pageSize);

    if (currentPage < totalPages - 1) {
      this.setState({ currentPage: currentPage + 1 });
    }
  };

  private _previousPage = () => {
    const { currentPage } = this.state;

    if (currentPage > 0) {
      this.setState({ currentPage: currentPage - 1 });
    }
  };

  private _reloadQuery() {
    const context = this.props.queryContext;

    this.messaging?.postMessage({
      id: 'ExecuteCommand',
      command: 'mentor.action.executeSparqlQuery',
      args: [{
        documentIri: context.documentIri,
        workspaceIri: context.workspaceIri,
        notebookIri: context.notebookIri,
        cellIndex: context.cellIndex,
        query: context.query
      }]
    });
  }

  private _saveResults() {
    const context = this.props.queryContext;

    this.messaging?.postMessage({
      id: 'ExecuteCommand',
      command: 'mentor.action.saveSparqlQueryResults',
      args: [context, 'csv']
    });
  }
}