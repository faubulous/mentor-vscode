import { Component } from 'react';
import { WebviewMessagingApi } from '@/views/webview-messaging';
import stylesheet from '@/views/sparql-results/sparql-results-welcome-view.css';
import codicons from '$/codicon.css';

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export class SparqlResultsWelcomeView extends Component {

	componentDidMount() {
		this._addStylesheet('codicon-styles', codicons);
		this._addStylesheet('sparql-welcome-styles', stylesheet);
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
		return <div className="container sparql-results-welcome">
			<div className="column column-left">
				<h3>SPARQL Query</h3>
				<p className="description">This panel displays the status and results of SPARQL
					queries that were executed from files in the editor. No queries have been executed yet.</p>

				<vscode-toolbar-container className="vertical link-buttons">
					<vscode-toolbar-button>
						<span className="codicon codicon-new-file"></span>
						<span className="label">New Query...</span>
					</vscode-toolbar-button>
					<vscode-toolbar-button>
						<span className="codicon codicon-folder-opened"></span>
						<span className="label">Open Query...</span>
					</vscode-toolbar-button>
					<vscode-toolbar-button>
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
}