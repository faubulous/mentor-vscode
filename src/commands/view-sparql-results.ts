import { sparqlResultsViewProvider } from '@/views/components';

export async function viewSparqlResults() {
	// Note: This does not work anymore as the SPARQL results need to be a BindingSet object.
	const tableData = [
		{ firstName: "Hans", lastName: "Wurscht", email: "hansw@yahoo.com" },
		{ firstName: "Clark", lastName: "Breitenberg", email: "Nat_Moore@gmail.com" },
	];
	
	sparqlResultsViewProvider.postMessage({ type: 'setTableData', data: tableData });
	sparqlResultsViewProvider.reveal();
}
