import { sparqlResultsViewProvider } from '@/views';

export async function viewSparqlResults() {
	const exampleData = {
		type: 'bindings',
		data: [
			{
				entries: {
					firstName: { value: "Hans" },
					lastName: { value: "Wurscht" },
					email: { value: "hansw@yahoo.com" }
				}
			},
			{
				entries: {
					firstName: { value: "Clark" },
					lastName: { value: "Breitenberg" },
					email: { value: "Nat_Moore@gmail.com" }
				}
			}
		]
	};
	
	sparqlResultsViewProvider.postMessage({ type: 'setTableData', data: exampleData });
	sparqlResultsViewProvider.reveal();
}
