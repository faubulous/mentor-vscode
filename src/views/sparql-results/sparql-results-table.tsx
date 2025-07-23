import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { SparqlQueryResults } from '@/services';
import { WebviewComponent, WebviewComponentProps } from '@/views/webview-component';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-table.css';

/**
 * Properties for the SPARQL results table component.
 */
export interface SparqlResultsTableProps extends WebviewComponentProps {
  /**
   * The SPARQL query results to display.
   */
  results: SparqlQueryResults;
}

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsTable extends WebviewComponent<SparqlResultsTableProps> {

  componentDidMount() {
    this.addStylesheet('codicon-styles', codicons);
    this.addStylesheet('sparql-table-styles', stylesheet);
  }

  render() {
    if (!this.props.results.endTime) {
      return this._renderExecuting();
    } else if (this.props.results.error) {
      return this._renderError();
    } else {
      return this._renderBindingsTable();
    }
  }

  private _renderExecuting() {
    return (
      <vscode-toolbar-container className="sparql-results-toolbar loading">
        <span className="status-icon">
          <span className="codicon codicon-sync codicon-modifier-spin"></span>
        </span>
        <span>Executing...</span>
        <span className="spacer"></span>
        <vscode-toolbar-button title="Cancel">
          <span className="codicon codicon-stop-circle"></span>
        </vscode-toolbar-button>
      </vscode-toolbar-container>
    );
  }

  private _renderError() {
    return (
      <vscode-toolbar-container className="sparql-results-toolbar error">
        <span className="status-icon">
          <span className="codicon codicon-error"></span>
        </span>
        <span>Error: {this.props.results.error?.message}</span>
        <span className="spacer"></span>
        <vscode-toolbar-button title="Reload">
          <span className="codicon codicon-refresh"></span>
        </vscode-toolbar-button>
      </vscode-toolbar-container>
    );
  }

  private _renderBindingsTable() {
    const results = this.props.results;

    return (
      <div className="sparql-results-container">
        <vscode-toolbar-container className="sparql-results-toolbar success">
          <span>
            <b>{results.totalLength}</b> results in {this._getDuration()}
          </span>
          <span className="spacer"></span>
          <vscode-toolbar-button title="Save" onClick={() => this._saveResults()}>
            <span className="codicon codicon-save-as"></span>
          </vscode-toolbar-button>
          <vscode-toolbar-button title="Reload">
            <span className="codicon codicon-refresh"></span>
          </vscode-toolbar-button>
        </vscode-toolbar-container>
        <vscode-table className="sparql-results-table" zebra bordered-rows resizable>
          <vscode-table-header>
            {results.columns.map(v => (
              <vscode-table-header-cell key={v}>{v}</vscode-table-header-cell>
            ))}
          </vscode-table-header>
          <vscode-table-body>
            {results.rows.slice(0, 1000).map((row, rowIndex) => (
              <vscode-table-row key={rowIndex}>
                {results.columns.map(header => (
                  <vscode-table-cell key={`${rowIndex}-${header}`}>
                    {this._renderCell(row[header], results.namespaceMap)}
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
    const start = new Date(this.props.results.startTime);
    const end = this.props.results.endTime ? new Date(this.props.results.endTime) : undefined;

    if (end && end > start) {
      // Return the duration in seconds with splitsecond precision
      const duration = (end.getTime() - start.getTime()) / 1000;

      return `${duration.toFixed(1)}s`;
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
    this.executeCommand('mentor.action.saveSparqlQueryResults', this.props.results, 'csv');
  }
}