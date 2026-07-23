import { useStylesheet } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/shared/use-shared-stylesheets';
import { SparqlRecentQueryList } from './sparql-recent-query-list';
import { SparqlConnectionsList } from './sparql-connections-list';
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
				<SparqlRecentQueryList />
				<SparqlConnectionsList />
			</div>
		</vscode-scrollable>
	);
}
