import { FunctionComponent } from 'react';
// import '@vscode-elements/elements';

export interface SparqlResultsData {
  type: string;
  data: any[];
}

export const SparqlResultsTable: FunctionComponent<{ results: SparqlResultsData }> = ({ results }) => {
  const data = results?.data || [];
  
  if (!data.length) {
    return <div>No results.</div>;
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
                {row.entries[header]?.value || ''}
              </vscode-table-cell>
            ))}
          </vscode-table-row>
        ))}
      </vscode-table-body>
    </vscode-table>
  );
};
