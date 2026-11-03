import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { VscodeTextfield } from '@vscode-elements/elements';
import { useStylesheet, useWebviewMessaging, useWebviewState } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/hooks/use-shared-stylesheets';
import { BlockList, RevealRequest } from './components/block-list';
import { ContextBar } from './components/context-bar';
import { DocumentHeader } from './components/document-header';
import { FormErrorBoundary } from './components/form-error-boundary';
import { FormToolbar } from './components/form-toolbar';
import { EmptyState, LoadingState, ProblemState, ReadOnlyBanner } from './components/resource-list-states';
import { DocumentProblem, DocumentSnapshot } from './form-editor-model';
import { FormEditorMessages, FormEditorWebviewMessage } from './form-editor-messages';
import { useBusyResources } from './hooks/use-busy-resources';
import { useFocusedBlock } from './hooks/use-focused-block';
import { useFormBlocks } from './hooks/use-form-blocks';
import { useLanguageSwitch } from './hooks/use-language-switch';
import { useScrolledPast } from './hooks/use-scrolled-past';
import { useUndoRouting } from './hooks/use-undo-routing';
import { EditingHostService } from './services/editing-host-service';
import { ResourceDataService } from './services/resource-data-service';
import { EditingController } from './state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from './state/form-editor-context';
import { PersistedViewState, ViewStateChanges } from './state/persisted-view-state';
import { ResourceCardStates } from './state/resource-card-states';
import { ResourceListFilter, TypeFilter } from './state/resource-list-filter';
import stylesheet from './form-editor.css';

/**
 * The form based editor for RDF documents: the toolbar with the filter, the header of the
 * document, the virtualized list of its resources and comments, and the overview ruler. Where
 * the document can be written, the statements of the cards are edited in place and handed to
 * the host as edits.
 */
function FormEditor(): React.JSX.Element {
	useSharedStylesheets();
	useStylesheet('mentor-form-editor', stylesheet);

	const [snapshot, setSnapshot] = useState<DocumentSnapshot>();
	const [storedViewState, setStoredViewState] = useWebviewState<unknown>(PersistedViewState.INITIAL.toJSON());
	const viewState = useMemo(() => PersistedViewState.read(storedViewState), [storedViewState]);
	const [cardStates, setCardStates] = useState(() => ResourceCardStates.fromOpenCards(PersistedViewState.read(storedViewState).openCards));
	const [filterText, setFilterText] = useState('');
	const [typeFilter, setTypeFilter] = useState<TypeFilter>();
	const [revealRequest, setRevealRequest] = useState<RevealRequest>();
	const [revealed, setRevealed] = useState<NamedNode | BlankNode>();
	const [currentId, setCurrentId] = useState<string>();
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
	const [titleElement, setTitleElement] = useState<HTMLDivElement | null>(null);
	const [rulerElement, setRulerElement] = useState<HTMLDivElement | null>(null);
	const filterRef = useRef<VscodeTextfield>(null);
	const messagingRef = useRef<{ postMessage: (message: FormEditorWebviewMessage) => void } | undefined>(undefined);
	const revealResourceRef = useRef<(resource: NamedNode | BlankNode) => void>(undefined);
	const titleScrolledPast = useScrolledPast(scrollElement, titleElement);

	// Every update starts from a state read the current way, whatever an earlier version stored.
	const updateViewState = useCallback((changes: ViewStateChanges) => {
		setStoredViewState((current: unknown) => PersistedViewState.read(current).with(changes).toJSON());
	}, [setStoredViewState]);

	const dataService = useMemo(() => new ResourceDataService(resources => messagingRef.current?.postMessage({ id: 'RequestResources', resources })), []);
	const hostService = useMemo(() => new EditingHostService(message => messagingRef.current?.postMessage(message)), []);
	const controller = useMemo(() => new EditingController(hostService), [hostService]);
	const focusedBlockId = useFocusedBlock(scrollElement);
	const busyIds = useBusyResources(controller);
	const routeUndo = useUndoRouting(scrollElement);

	const onMessage = useCallback((message: FormEditorMessages) => {
		switch (message.id) {
			case 'DocumentSnapshot':
				dataService.setSnapshot(message.snapshot.version, message.snapshot.revision);
				setSnapshot(message.snapshot);
				break;
			case 'ResourcesLoaded':
				dataService.accept(message.revision, message.resources, message.missing);
				break;
			case 'EditApplied':
			case 'EditRejected':
				hostService.accept(message);
				break;
			case 'ScrollToResource':
				revealResourceRef.current?.(message.resource);
				break;
			case 'FilterResources':
				setTypeFilter({ label: message.label, resourceKeys: new Set(message.resources.map(resource => termToString(resource))) });
				break;
			default:
				break;
		}
	}, [dataService, hostService]);

	const messaging = useWebviewMessaging<FormEditorMessages>(onMessage);

	useEffect(() => {
		messagingRef.current = messaging;
		messaging?.postMessage({ id: 'Ready' });
	}, [messaging]);

	const post = useCallback((message: FormEditorWebviewMessage) => messagingRef.current?.postMessage(message), []);

	// The open cards belong to a document: when the webview is reused for another, they are dropped.
	const documentUri = snapshot?.uri;

	useEffect(() => {
		if (documentUri !== undefined && viewState.documentUri !== documentUri) {
			setCardStates(ResourceCardStates.NONE);
			setTypeFilter(undefined);
			updateViewState({ documentUri, openCards: [] });
		}
		// Only when the document changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [documentUri]);

	// The open cards are remembered as they change.
	useEffect(() => {
		const openCards = cardStates.openCards();

		if (!_sameKeys(viewState.openCards, openCards)) {
			updateViewState({ openCards });
		}
	}, [cardStates, viewState.openCards, updateViewState]);

	const handleToggle = useCallback((resource: NamedNode | BlankNode) => {
		const key = termToString(resource);

		if (cardStates.stateOf(key).open === 'collapsed') {
			dataService.request([resource]);
		}

		setRevealed(undefined);
		setCardStates(current => current.toggle(key));
	}, [cardStates, dataService]);

	const declarationsHidden = viewState.hideExternalDeclarations === true;
	const listFilter = useMemo(() => new ResourceListFilter({ text: filterText, type: typeFilter, hideExternalDeclarations: declarationsHidden }), [filterText, typeFilter, declarationsHidden]);
	const filtering = listFilter.hasText || typeFilter !== undefined;
	const visibleResources = useMemo(() => listFilter.apply(snapshot?.resources ?? []), [listFilter, snapshot?.resources]);
	const documentTerm = snapshot?.documentResource;
	const documentResource = useMemo(() => snapshot?.resources.find(resource => documentTerm?.equals(resource.term)), [snapshot?.resources, documentTerm]);

	// The resource describing the document heads the form; every other resource is a card.
	const listed = useMemo(() => visibleResources.filter(resource => !documentTerm?.equals(resource.term)), [visibleResources, documentTerm]);
	const blocks = useFormBlocks(listed, snapshot?.trailingComments ?? [], filtering);

	const handleToggleExternalDeclarations = useCallback(() => {
		updateViewState({ hideExternalDeclarations: declarationsHidden ? undefined : true });
	}, [updateViewState, declarationsHidden]);

	const handleRevealResource = useCallback((resource: NamedNode | BlankNode) => {
		// A resource the filter leaves out is revealed among all of them, hidden declarations included.
		if (!visibleResources.some(visible => visible.term.equals(resource))) {
			setTypeFilter(undefined);
			setFilterText('');
			updateViewState({ hideExternalDeclarations: undefined });
		}

		// The card is marked rather than opened: what it holds is the reader's to open.
		setRevealed(resource);

		if (documentTerm?.equals(resource)) {
			scrollElement?.scrollTo({ top: 0 });
		} else {
			setRevealRequest({ resource });
		}
	}, [visibleResources, updateViewState, documentTerm, scrollElement]);

	revealResourceRef.current = handleRevealResource;

	const handleRevealInTextEditor = useCallback((line: number, character: number) => post({ id: 'RevealInTextEditor', position: { line, character } }), [post]);
	const handleOpenTextEditor = useCallback(() => post({ id: 'ExecuteCommand', command: 'mentor.command.openTextEditor' }), [post]);
	const handleOpenExternal = useCallback((iri: string) => post({ id: 'ExecuteCommand', command: 'vscode.open', args: [iri] }), [post]);
	const handleRevealProblem = useCallback((problem: DocumentProblem) => handleRevealInTextEditor(problem.line, problem.character), [handleRevealInTextEditor]);

	// Undo in a field undoes its typing, elsewhere the document; the filter is the find of the form.
	const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
		if (routeUndo(event)) {
			return;
		}

		if (event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			filterRef.current?.focus();
		}
	}, [routeUndo]);

	const { languageFilter, switchProps } = useLanguageSwitch(snapshot, viewState, updateViewState, post);

	// Nothing is edited in a document that cannot be written back.
	const editable = snapshot !== undefined && snapshot.readOnly === undefined;

	// The card holding the focus, and those whose writes are not done, stay mounted while they are
	// scrolled out of view.
	const pinnedIds = useMemo(() => new Set([...busyIds, ...(focusedBlockId !== undefined ? [focusedBlockId] : [])]), [busyIds, focusedBlockId]);

	const context: FormEditorContextValue = useMemo(() => ({
		readOnly: !editable,
		editing: editable ? controller : undefined,
		namespaces: snapshot?.namespaces ?? [],
		languageTags: snapshot?.languageTags ?? {},
		languageFilter,
		resources: snapshot?.resources,
		onRevealResource: handleRevealResource,
		onOpenExternal: handleOpenExternal,
		revealedResource: revealed,
		dominantTypeIri: snapshot?.dominantTypeIri,
		filterText
	}), [snapshot, editable, controller, languageFilter, handleRevealResource, handleOpenExternal, revealed, filterText]);

	if (!snapshot) {
		return (
			<div className="form-editor">
				<LoadingState />
			</div>
		);
	}

	const blocking = snapshot.readOnly !== undefined && snapshot.resources.length === 0;
	const current = currentId ? listed.find(resource => termToString(resource.term) === currentId) : undefined;

	return (
		<FormEditorContext.Provider value={context}>
			<div className="form-editor" onKeyDown={handleKeyDown}>
				{!blocking && (
					<FormToolbar
						filter={{
							text: filterText,
							onChange: setFilterText,
							matchCount: listed.length,
							token: typeFilter?.label,
							onClearToken: () => setTypeFilter(undefined),
							shortcut: _isMac() ? '⌘F' : 'Ctrl+F',
							fieldRef: filterRef
						}}
						languages={switchProps}
						externalDeclarationsHidden={declarationsHidden}
						onToggleExternalDeclarations={handleToggleExternalDeclarations}
					/>
				)}
				{snapshot.readOnly && !blocking && <ReadOnlyBanner readOnly={snapshot.readOnly} onOpenTextEditor={handleOpenTextEditor} />}
				{blocking && snapshot.readOnly
					? <ProblemState readOnly={snapshot.readOnly} problems={snapshot.problems} onRevealProblem={handleRevealProblem} onOpenTextEditor={handleOpenTextEditor} />
					: (
						<FormErrorBoundary onOpenTextEditor={handleOpenTextEditor} resetKey={snapshot.version}>
							<div className="form-editor-body">
								<div className="form-editor-ruler" ref={setRulerElement} />
								<div className="form-editor-scroll" ref={setScrollElement} tabIndex={-1}>
									<ContextBar
										visible={titleScrolledPast}
										title={documentResource?.label ?? snapshot.fileName}
										iconName={documentResource?.iconName}
										guideWord={current?.label}
										position={current ? listed.indexOf(current) + 1 : undefined}
										count={listed.length}
										filtering={filtering}
										onActivate={() => scrollElement?.scrollTo({ top: 0, behavior: 'smooth' })}
									/>
									<div className="form-editor-content">
										<DocumentHeader fileName={snapshot.fileName} documentResource={documentResource} titleRef={setTitleElement} />
										{snapshot.resources.length === 0
											? <EmptyState onOpenTextEditor={handleOpenTextEditor} />
											: (
												<BlockList
													blocks={blocks}
													dataService={dataService}
													scrollElement={scrollElement}
													cardStates={cardStates}
													pinnedIds={pinnedIds}
													busyIds={busyIds}
													onToggle={handleToggle}
													revealRequest={revealRequest}
													rulerElement={rulerElement}
													filtering={filtering}
													onCurrentChange={setCurrentId}
												/>
											)}
									</div>
								</div>
							</div>
						</FormErrorBoundary>
					)}
			</div>
		</FormEditorContext.Provider>
	);
}

/**
 * Indicate whether the editor runs on a Mac, whose shortcuts are written with ⌘.
 * @returns `true` on a Mac.
 */
function _isMac(): boolean {
	return /mac/i.test(navigator.platform);
}

/**
 * Indicate whether two lists of keys hold the same keys in the same order.
 * @param first The first list.
 * @param second The second list.
 * @returns `true` when they are the same.
 */
function _sameKeys(first: readonly string[], second: readonly string[]): boolean {
	return first.length === second.length && first.every((key, index) => key === second[index]);
}

const root = createRoot(document.getElementById('root')!);
root.render(<FormEditor />);
