import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { BindingsResult, SparqlQueryContext } from '@/services';
import { WebviewComponent, WebviewComponentProps } from '@/views/webview-component';
import { Stopwatch } from './stopwatch';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-table.css';
/**
 * Properties for the SPARQL results table component.
 */
export interface SparqlResultsTableProps extends WebviewComponentProps {
  /**
   * The SPARQL query results to display.
   */
  queryContext: SparqlQueryContext;
}

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsTable extends WebviewComponent<SparqlResultsTableProps> {
  message?: SparqlQueryContext;

  componentDidMount() {
    this.addStylesheet('codicon-styles', codicons);
    this.addStylesheet('sparql-table-styles', stylesheet);
  }

  render() {
    if (!this.props.queryContext.endTime) {
      return this._renderExecuting();
    } else if (this.props.queryContext.error) {
      return this._renderError();
    } else if (this.props.queryContext.result) {
      return this._renderBindingsTable();
    }
  }

  private _renderExecuting() {
    return (
      <div>
        <vscode-toolbar-container className="sparql-results-toolbar loading">
          <vscode-toolbar-button title="Cancel">
            <span className="codicon codicon-debug-stop"></span>
          </vscode-toolbar-button>
          <span className="divider divider-vertical"></span>
          <Stopwatch queryContext={this.props.queryContext} />
        </vscode-toolbar-container>
        <div className="sparql-results-content-container">
          <span className="status-icon">
            <span className="codicon codicon-sync codicon-modifier-spin"></span>
          </span>
          <span>Executing...</span>
          <span className="spacer"></span>
        </div>
      </div>
    );
  }

  private _renderError() {
    return (
      <div>
        <vscode-toolbar-container className="sparql-results-toolbar error">
          <vscode-toolbar-button title="Reload">
            <span className="codicon codicon-debug-restart"></span>
          </vscode-toolbar-button>
          <span className="divider divider-vertical"></span>
          <Stopwatch queryContext={this.props.queryContext} />
        </vscode-toolbar-container>
        <div>
          <span className="status-icon">
            <span className="codicon codicon-error"></span>
          </span>
          <span>Error: {this.props.queryContext.error?.message}</span>
        </div>
      </div>
    );
  }

  private _renderBindingsTable() {
    const result = this.props.queryContext.result as BindingsResult;
    const range = {
      start: 1,
      end: Math.min(result.rows.length, 1000)
    };

    return (
      <div className="sparql-results-container">
        <vscode-toolbar-container className="sparql-results-toolbar success">
          <vscode-toolbar-button title="Reload">
            <span className="codicon codicon-debug-restart"></span>
          </vscode-toolbar-button>
          <span className="divider divider-vertical"></span>
          <Stopwatch queryContext={this.props.queryContext} />
          <span className="divider divider-vertical"></span>
          <vscode-toolbar-button title="Previous page">
            <span className="codicon codicon-chevron-left"></span>
          </vscode-toolbar-button>
          {range.start}-{range.end} of {result.rows.length} rows
          <vscode-toolbar-button title="Next page">
            <span className="codicon codicon-chevron-right"></span>
          </vscode-toolbar-button>
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
            {result.rows.slice(0, 1000).map((row, rowIndex) => (
              <vscode-table-row key={rowIndex}>
                {result.columns.map(header => (
                  <vscode-table-cell key={`${rowIndex}-${header}`}>
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

  private _getDuration(): string {
    const start = new Date(this.props.queryContext.startTime);
    const end = this.props.queryContext.endTime ? new Date(this.props.queryContext.endTime) : undefined;

    if (end && end > start) {
      // Return the duration in seconds with splitsecond precision
      const duration = (end.getTime() - start.getTime()) / 1000;

      return `${duration.toFixed(2)}s`;
    } else {
      return '';
    }
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

  private _saveResults() {
    this.executeCommand('mentor.action.saveSparqlQueryResults', this.props.queryContext, 'csv');
  }
}