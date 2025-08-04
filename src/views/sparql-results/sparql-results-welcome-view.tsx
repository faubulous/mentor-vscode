import { WebviewComponent } from '@/views/webview-component';
import codicons from '$/codicon.css';
import stylesheet from './sparql-results-welcome-view.css';

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export class SparqlResultsWelcomeView extends WebviewComponent {

	componentDidMount() {
		this.addStylesheet('codicon-styles', codicons);
		this.addStylesheet('sparql-welcome-styles', stylesheet);
	}

	render() {
		return <div className="container sparql-results-welcome">
			<div className="column column-left">
				<h3>SPARQL Query</h3>
				<p className="description">This panel displays the status and results of <a href="https://www.w3.org/TR/sparql11-query/" target="_blank">SPARQL</a> queries
					that were executed from files in the editor.</p>

				<vscode-toolbar-container className="vertical link-buttons link-buttons-xl">
					<vscode-toolbar-button onClick={() => this._createSparqlQueryFile()}>
						<span className="codicon codicon-new-file"></span>
						<span className="label">New Query...</span>
					</vscode-toolbar-button>
					<vscode-toolbar-button onClick={() => this._openSparqlQueryFile()}>
						<span className="codicon codicon-folder-opened"></span>
						<span className="label">Open Query...</span>
					</vscode-toolbar-button>
					<vscode-toolbar-button onClick={() => this._connectToEndpoint()}>
						<span className="codicon codicon-debug-disconnect"></span>
						<span className="label">Connect to Endpoint...</span>
					</vscode-toolbar-button>
				</vscode-toolbar-container>
			</div>
			<div className="column column-right">
				<h3>Recent</h3>
				<vscode-toolbar-container className="vertical link-buttons">
					<vscode-toolbar-button>
						<span className='label'>path/to/file/a.spaql</span>
					</vscode-toolbar-button>
					<vscode-toolbar-button>
						<span className='label'>path/to/file/b.spaql</span>
					</vscode-toolbar-button>
					<vscode-toolbar-button>
						<span className='label'>path/to/file/c.spaql</span>
					</vscode-toolbar-button>
				</vscode-toolbar-container>
			</div>
		</div>;
	}

	private _createSparqlQueryFile() {
		this.executeCommand('mentor.action.createSparqlQueryFile');
	}

	private _openSparqlQueryFile() {
		this.executeCommand('mentor.action.openSparqlQueryFile');
	}

	private _connectToEndpoint() {
		this.executeCommand('mentor.action.connectToSparqlEndpoint');
	}
}