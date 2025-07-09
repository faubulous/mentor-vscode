import { Component } from 'react';
import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { SparqlQueryResults } from '@/services';
import { WebviewMessagingApi } from '@/views/webview-messaging';
import stylesheet from './sparql-results-table.css';

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsTable extends Component<SparqlResultsTableProps> {
  state: SparqlResultsTableState;

  constructor(props: SparqlResultsTableProps) {
    super(props);

    this.state = {
      loading: false,
      data: props.results
    }
  }

  componentDidMount() {
    if (!document.getElementById('sparql-table-styles')) {
      const style = document.createElement('style');
      style.id = 'sparql-table-styles';
      style.textContent = stylesheet;

      document.head.appendChild(style);
    }
  }

  render() {
    const data = this.state.data;

    if (data.rows.length === 0) {
      return this._renderEmptyResults();
    } else {
      return this._renderTable(data);
    }
  }

  private _renderEmptyResults() {
    return (
      <div className="sparql-results-empty">
        <p>No results.</p>
      </div>
    );
  }

  private _renderTable(results: SparqlQueryResults) {
    return (<div className="sparql-results-container">
      <vscode-toolbar-container className="sparql-results-toolbar" style={{}}>
        <span style={{ marginRight: 'auto' }}>
          Showing {results.rows.length} of {results.totalLength} rows
        </span>
        <vscode-toolbar-button>Save as</vscode-toolbar-button>
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
                  {this._renderCell(row[header])}
                </vscode-table-cell>
              ))}
            </vscode-table-row>
          ))}
        </vscode-table-body>
      </vscode-table>
    </div>);
  }

  private _renderCell(binding: Term | undefined) {
    const namespaceMap = this.state.data.namespaceMap;

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
}

/**
 * State interface for the SPARQL results table component.
 */
interface SparqlResultsTableState {
  /**
   * Indicates if the results are currently loading.
   */
  loading: boolean;

  /**
   * The SPARQL query results data.
   */
  data: SparqlQueryResults;
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