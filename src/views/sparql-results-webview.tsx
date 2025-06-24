import { createRoot } from 'react-dom/client';
import { SparqlResultsTable } from './sparql-results-table';

const root = createRoot(document.getElementById('root')!);
root.render(<div>Loading...</div>);

window.addEventListener('message', event => {
	const message = event.data;

	if (message.type === 'setTableData') {
		root.render(<SparqlResultsTable results={message.data} />);
	}
});

window.parent.postMessage({ type: 'ready' }, '*');
