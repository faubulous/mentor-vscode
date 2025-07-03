import { Component } from 'react';
import { Term } from '@rdfjs/types';
import { getNamespaceIri, PrefixMap } from '@/utilities';
import { SparqlQueryResults } from '@/services';
import { WebviewMessagingApi } from '@/views/webview-messaging';
import stylesheet from './sparql-results-table.css';

/**
 * Interface for SPARQL results table component.
 */
export interface SparqlResultsTableProps {
  results: SparqlQueryResults;
  messaging?: WebviewMessagingApi;
}

/**
 * Component to display SPARQL bindings in a table format.
 */
export class SparqlResultsTable extends Component<SparqlResultsTableProps> {
  state: {
    loading: boolean;
    data: SparqlQueryResults;
    namespaceMap: PrefixMap;
  }

  constructor(props: SparqlResultsTableProps) {
    super(props);

    this.state = {
      loading: true,
      data: props.results,
      namespaceMap: {}
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

  formatCell = (binding: Term | undefined) => {
    const namespaceMap = this.state.data.namespaceMap;

    switch (binding?.termType) {
      case 'NamedNode': {
        const namespaceIri = getNamespaceIri(binding.value);
        const prefix = namespaceMap[namespaceIri];

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

  render() {
    const data = this.state.data;

    if (data.rows.length === 0) {
      return (
        <div>No results.</div>
      );
    } else {
      return (
        <div>
          <vscode-table zebra bordered-rows>
            <vscode-table-header>
              {data.columns.map(v => (
                <vscode-table-header-cell key={v}>{v}</vscode-table-header-cell>
              ))}
            </vscode-table-header>
            <vscode-table-body>
              {data.rows.map((row, rowIndex) => (
                <vscode-table-row key={rowIndex}>
                  {data.columns.map(header => (
                    <vscode-table-cell key={`${rowIndex}-${header}`}>
                      {this.formatCell(row[header])}
                    </vscode-table-cell>
                  ))}
                </vscode-table-row>
              ))}
            </vscode-table-body>
          </vscode-table>
          Messaging available: {this.props.messaging ? 'true' : 'false'}
        </div>
      );
    }
  }
}
