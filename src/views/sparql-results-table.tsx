import { FunctionComponent } from 'react';
import { BlankNode, Literal, NamedNode } from '@rdfjs/types';
import { PrefixLookupService } from '@/services';
import { getNamespaceIri } from '@/utilities';

export interface SparqlResultsData {
  documentIri: string;
  prefixService: PrefixLookupService;
  type: string;
  data: any[];
}

export const SparqlResultsTable: FunctionComponent<{ results: SparqlResultsData }> = ({ results }) => {
  const data = results?.data || [];

  if (!data.length) {
    return <div>No results.</div>;
  }

  const getCellValue = (binding?: NamedNode | BlankNode | Literal) => {
    switch (binding?.termType) {
      case 'NamedNode': {
        // const namespaceIri = getNamespaceIri(binding.value);
        // const prefix = results.prefixService.getPrefixForIri(results.documentIri, namespaceIri, 'nsX');
        // const value = `${prefix}:${binding.value.substring(namesapceIri.length)}`;

        return (<a>{binding.value}</a>);
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

  const headers = Object.keys(data[0].entries || {});

  return (
    <vscode-table zebra bordered-rows>
      <vscode-table-header>
        {headers.map(header => (
          <vscode-table-header-cell key={header}>{header}</vscode-table-header-cell>
        ))}
      </vscode-table-header>
      <vscode-table-body>
        {data.map((row, rowIndex) => (
          <vscode-table-row key={rowIndex}>
            {headers.map(header => (
              <vscode-table-cell key={`${rowIndex}-${header}`}>
                {getCellValue(row.entries[header])}
              </vscode-table-cell>
            ))}
          </vscode-table-row>
        ))}
      </vscode-table-body>
    </vscode-table>
  );
};
