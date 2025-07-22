import { Component } from 'react';
import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { SparqlQueryResults } from '@/services';
import { WebviewMessagingApi } from '@/views/webview-messaging';
import stylesheet from '@/views/sparql-results/sparql-results-table.css';
import codicons from '$/codicon.css';

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsTable extends Component<SparqlResultsTableProps> {

  componentDidMount() {
    this._addStylesheet('codicon-styles', codicons);
    this._addStylesheet('sparql-table-styles', stylesheet);
  }

  private _addStylesheet(id: string, content: string) {
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = content;

      document.head.appendChild(style);
    }
  }

  render() {
    const results = this.props.results;

    if (!results.endTime) {
      return this._renderExecuting(results);
    } else if (results.error) {
      return this._renderError(results);
    } else {
      return this._renderBindingsTable(results);
    }
  }

  private _renderExecuting(results: SparqlQueryResults) {
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

  private _renderError(results: SparqlQueryResults) {
    return (
      <vscode-toolbar-container className="sparql-results-toolbar error">
        <span className="status-icon">
          <span className="codicon codicon-error"></span>
        </span>
        <span>Error: {results.error?.message}</span>
        <span className="spacer"></span>
        <vscode-toolbar-button title="Reload">
          <span className="codicon codicon-refresh"></span>
        </vscode-toolbar-button>
      </vscode-toolbar-container>
    );
  }

  private _renderBindingsTable(results: SparqlQueryResults) {
    return (
      <div className="sparql-results-container">
        <vscode-toolbar-container className="sparql-results-toolbar success">
          <span>
            <b>{results.totalLength}</b> results in {this._getDuration(results)}
          </span>
          <span className="spacer"></span>
          <vscode-toolbar-button title="Save" onClick={() => this._saveResults(results)}>
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

  private _getDuration(results: SparqlQueryResults): string {
    const start = new Date(results.startTime);
    const end = results.endTime ? new Date(results.endTime) : undefined;

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

  private _saveResults(results: SparqlQueryResults) {
    if (this.props.messaging) {
      const message = {
        type: 'executeCommand',
        command: 'mentor.action.saveSparqlQueryResults',
        args: [results, 'csv']
      }

      this.props.messaging.postMessage(message);
    } else {
      console.warn('No messaging API available to save results.');
    }
  }
}

/**
 * State interface for the SPARQL results table component.
 */
interface SparqlResultsTableState {
  /**
   * The SPARQL query results data.
   */
  results: SparqlQueryResults;
}

/**
 * Interface for SPARQL results table component.
 */
export interface SparqlResultsTableProps {
  /**
   * The SPARQL query results to display.
   */
  results: SparqlQueryResults;

  /**
   * Optional messaging API for communication with the extension host.
   */
  messaging?: WebviewMessagingApi;
}