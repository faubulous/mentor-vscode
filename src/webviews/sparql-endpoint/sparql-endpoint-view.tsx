import { createRoot } from 'react-dom/client';
import { WebviewHost } from '@/webviews/webview-host';
import { WebviewComponent } from '@/webviews/webview-component';
import { SparqlEndpointMessages } from './sparql-endpoint-messages';
import stylesheet from './sparql-endpoint-view.css';

interface SparqlEndpointViewState { }

/**
 * Component to edit SPARQL endpoint settings, e.g. endpoint URL and authentication.
 */
export class SparqlEndpointView extends WebviewComponent<
	{},
	SparqlEndpointViewState,
	SparqlEndpointMessages
> {
	messaging = WebviewHost.getMessaging<SparqlEndpointMessages>();

	componentDidMount() {
		super.componentDidMount();

		this.addStylesheet('sparql-endpoint-styles', stylesheet);
	}

	render() {
		return (
			<div className="sparql-endpoint-view-container">
				<h1>Hello World</h1>
			</div>
		);
	}

	private _executeCommand(command: string, ...args: any[]) {
		this.messaging.postMessage({ id: 'ExecuteCommand', command, args });
	}
}

const root = createRoot(document.getElementById('root')!);
root.render(<SparqlEndpointView />);