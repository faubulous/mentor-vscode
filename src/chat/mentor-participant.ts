import * as vscode from 'vscode';

export const PARTICIPANT_ID = 'faubulous.mentor.chat';

const log = vscode.window.createOutputChannel('Mentor Chat', { log: true });

const SYSTEM_PROMPT =
	`You are the Mentor Knowledge Graph assistant, running inside VS Code.\n` +
	`Mentor manages an in-memory RDF triple store built from the workspace's RDF files.\n` +
	`You have direct API access to this store through the tools below.\n` +
	`\n` +
	`RULES — always follow:\n` +
	`1. Never read workspace files (.ttl, .rdf, .owl, .n3, .jsonld). File reads fail on remote connections.\n` +
	`2. The workspace vocabulary and namespace prefixes are pre-loaded in the next message.\n` +
	`   Do NOT call mentor_get_vocabulary or mentor_get_prefixes — use the pre-loaded data instead.\n` +
	`3. Call mentor_get_query_context for any domain-specific question before writing SPARQL.\n` +
	`   Pass individual concept nouns as separate terms, not full phrases.\n` +
	`   One term per concept — e.g. ["Part", "stock"] not ["spare part with lowest stock level"].\n` +
	`4. Use mentor_list_datasets for questions about which datasets are loaded and their creation dates.\n` +
	`5. Use mentor_list_instances to enumerate individuals of a class before writing queries against them.\n` +
	`6. Scope all SPARQL to the named graph(s) returned by mentor_get_query_context or mentor_list_graphs.\n` +
	`7. Validate generated SPARQL with mentor_validate_sparql before executing it.\n` +
	`8. Before writing SPARQL, verify the primary SELECT variable represents the class the user asked for.\n` +
	`   If the query context returns a class that is a container or measurement of another class,\n` +
	`   use its depth-2 properties to find the property referencing the intended class and JOIN through it.\n` +
	`9. When a label search returns no results, do not conclude the data is absent. Reason about what\n` +
	`   properties on RELATED CLASSES could indirectly encode the concept (e.g. a unit property whose\n` +
	`   values are volume IRIs as a proxy for fluid content). Call mentor_get_query_context on the\n` +
	`   RELATED CLASS NAME (e.g. "Stock", "Quantity") — not on abstract vocabulary terms — to get its\n` +
	`   actual depth-2 property chain and inspect example values for semantic proxies.\n` +
	`10. When a SPARQL query returns 0 results unexpectedly, verify the property path exists before\n` +
	`    concluding no matches exist. Run: SELECT ?p ?o WHERE { ?s a <classIri> . ?s ?p ?o } LIMIT 10\n` +
	`    on the key class to see its real properties, then correct and re-run the query.`;

export function registerMentorParticipant(context: vscode.ExtensionContext): void {
	log.info('[mentor] registering chat participant');

	const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handleRequest);
	participant.requestHandler = handleRequest;
	participant.iconPath = new vscode.ThemeIcon('app-mentor');

	context.subscriptions.push(participant);

	log.info('[mentor] chat participant registered');
}

async function handleRequest(
	request: vscode.ChatRequest,
	chatContext: vscode.ChatContext,
	stream: vscode.ChatResponseStream,
	token: vscode.CancellationToken
): Promise<void> {
	log.info(`[mentor] handleRequest called: "${request.prompt}"`);

	stream.progress('Loading workspace context…');

	try {
		const mentorTools = vscode.lm.tools.filter(t => t.name.startsWith('mentor_'));
		log.info(`[mentor] model=${request.model?.id}, tools=${mentorTools.map(t => t.name).join(', ')}`);

		const messages: vscode.LanguageModelChatMessage[] = [
			vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT),
			vscode.LanguageModelChatMessage.Assistant('Understood. I will follow these rules and always use the Mentor tools.')
		];

		// Pre-load vocabulary and prefixes in parallel so the agent can reason about
		// the domain model without spending tool-call roundtrips on discovery.
		const [vocabResult, prefixResult] = await Promise.allSettled([
			vscode.lm.invokeTool('mentor_get_vocabulary', { input: {}, toolInvocationToken: request.toolInvocationToken }, token),
			vscode.lm.invokeTool('mentor_get_prefixes', { input: {}, toolInvocationToken: request.toolInvocationToken }, token)
		]);

		const contextParts: string[] = [];
		if (vocabResult.status === 'fulfilled') {
			const text = extractToolText(vocabResult.value.content);
			if (text) contextParts.push(`VOCABULARY:\n${text}`);
		} else {
			log.warn('[mentor] vocabulary pre-load failed: ' + vocabResult.reason);
		}
		if (prefixResult.status === 'fulfilled') {
			const text = extractToolText(prefixResult.value.content);
			if (text) contextParts.push(`PREFIXES:\n${text}`);
		}
		if (contextParts.length > 0) {
			messages.push(vscode.LanguageModelChatMessage.User(contextParts.join('\n\n')));
			messages.push(vscode.LanguageModelChatMessage.Assistant(
				'Workspace context loaded. I have the full vocabulary and prefix map.'
			));
		}

		for (const turn of chatContext.history) {
			if (turn instanceof vscode.ChatRequestTurn) {
				messages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
			} else if (turn instanceof vscode.ChatResponseTurn) {
				const textParts = turn.response
					.filter((r): r is vscode.ChatResponseMarkdownPart => r instanceof vscode.ChatResponseMarkdownPart)
					.map(r => new vscode.LanguageModelTextPart(r.value.value));

				if (textParts.length > 0) {
					messages.push(vscode.LanguageModelChatMessage.Assistant(textParts));
				}
			}
		}

		messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

		await runAgenticLoop(request.model, messages, stream, token, request.toolInvocationToken, mentorTools);

		log.info('[mentor] handleRequest: done');
	} catch (e) {
		const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);

		log.error('[mentor] handleRequest error: ' + msg);

		stream.markdown(`\n\n**Mentor error:** ${msg}`);
	}
}

function extractToolText(content: Array<vscode.LanguageModelTextPart | vscode.LanguageModelPromptTsxPart>): string {
	return content
		.filter((p): p is vscode.LanguageModelTextPart => p instanceof vscode.LanguageModelTextPart)
		.map(p => p.value)
		.join('');
}

async function runAgenticLoop(
	model: vscode.LanguageModelChat,
	messages: vscode.LanguageModelChatMessage[],
	stream: vscode.ChatResponseStream,
	token: vscode.CancellationToken,
	toolInvocationToken: vscode.ChatParticipantToolToken | undefined,
	tools: readonly vscode.LanguageModelToolInformation[],
	maxIterations = 10
): Promise<void> {
	for (let i = 0; i < maxIterations; i++) {
		if (token.isCancellationRequested) return;

		log.info(`[mentor] loop iteration ${i}: calling model.sendRequest`);
		const response = await model.sendRequest(messages, { tools: tools as unknown as vscode.LanguageModelChatTool[] }, token);
		log.info('[mentor] stream started');

		const toolCalls: vscode.LanguageModelToolCallPart[] = [];
		const assistantParts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart> = [];

		for await (const chunk of response.stream) {
			if (chunk instanceof vscode.LanguageModelTextPart) {
				stream.markdown(chunk.value);
				assistantParts.push(chunk);
			} else if (chunk instanceof vscode.LanguageModelToolCallPart) {
				log.info(`[mentor] tool call: ${chunk.name}`);
				toolCalls.push(chunk);
				assistantParts.push(chunk);
			}
		}

		log.info(`[mentor] stream done: ${assistantParts.length} parts, ${toolCalls.length} tool calls`);

		if (toolCalls.length === 0) return;

		messages.push(vscode.LanguageModelChatMessage.Assistant(assistantParts));

		stream.progress(`Calling ${toolCalls.map(tc => tc.name).join(', ')}…`);

		const toolResults = await Promise.all(toolCalls.map(async tc => {
			log.info(`[mentor] invoking: ${tc.name}`);
			try {
				const result = await vscode.lm.invokeTool(
					tc.name,
					{ input: tc.input as Record<string, unknown>, toolInvocationToken },
					token
				);
				log.info(`[mentor] result: ${tc.name}`);
				return new vscode.LanguageModelToolResultPart(tc.callId, result.content);
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				log.error(`[mentor] tool error ${tc.name}: ${msg}`);
				return new vscode.LanguageModelToolResultPart(tc.callId, [
					new vscode.LanguageModelTextPart(`Error: ${msg}`)
				]);
			}
		}));

		messages.push(vscode.LanguageModelChatMessage.User(toolResults));
	}
}
