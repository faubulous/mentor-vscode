import { useStylesheet } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/hooks/use-shared-stylesheets';
import { SparqlConnectionsList } from './sparql-connections-list';
import { SparqlRecentQueryList } from './sparql-recent-query-list';
import stylesheet from './sparql-welcome-view.css';

/**
 * Component to display a welcome message for the SPARQL results view.
 */
export function SparqlWelcomeView() {
	useSharedStylesheets();
	useStylesheet('sparql-welcome-styles', stylesheet);

	return (
		<vscode-scrollable>
			<div className="sparql-welcome-view-container">
				<SparqlConnectionsList />
				<SparqlRecentQueryList />
			</div>
		</vscode-scrollable>
	);
}
