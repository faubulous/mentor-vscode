import * as vscode from 'vscode';
import { MentorMcpServices } from './mcp-utils';
import { ListGraphsTool } from './tools/list-graphs';
import { GetVocabularyTool } from './tools/get-vocabulary';
import { GetPrefixesTool } from './tools/get-prefixes';
import { ExecuteSparqlTool } from './tools/execute-sparql';
import { SearchByLabelTool } from './tools/search-by-label';
import { DescribeResourceTool } from './tools/describe-resource';
import { ValidateSparqlTool } from './tools/validate-sparql';
import { GetClassPropertiesTool } from './tools/get-class-properties';
import { ListDatasetsTool } from './tools/list-datasets';
import { ListInstancesTool } from './tools/list-instances';
import { GetQueryContextTool } from './tools/get-query-context';

export function registerMcpTools(context: vscode.ExtensionContext, services: MentorMcpServices): void {
	context.subscriptions.push(
		vscode.lm.registerTool('mentor_list_graphs', new ListGraphsTool(services)),
		vscode.lm.registerTool('mentor_get_vocabulary', new GetVocabularyTool(services)),
		vscode.lm.registerTool('mentor_get_prefixes', new GetPrefixesTool(services)),
		vscode.lm.registerTool('mentor_execute_sparql', new ExecuteSparqlTool(services)),
		vscode.lm.registerTool('mentor_search_by_label', new SearchByLabelTool(services)),
		vscode.lm.registerTool('mentor_describe_resource', new DescribeResourceTool(services)),
		vscode.lm.registerTool('mentor_validate_sparql', new ValidateSparqlTool()),
		vscode.lm.registerTool('mentor_get_class_properties', new GetClassPropertiesTool(services)),
		vscode.lm.registerTool('mentor_list_datasets', new ListDatasetsTool(services)),
		vscode.lm.registerTool('mentor_list_instances', new ListInstancesTool(services)),
		vscode.lm.registerTool('mentor_get_query_context', new GetQueryContextTool(services))
	);
}
