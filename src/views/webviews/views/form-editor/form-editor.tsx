import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VscodeTextfield } from '@vscode-elements/elements';
import { useStylesheet, useWebviewMessaging, useWebviewState } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/hooks/use-shared-stylesheets';
import { BlockList, RevealRequest } from './components/block-list';
import { ContextBar } from './components/context-bar';
import { DocumentHeader } from './components/document-header';
import { FormErrorBoundary } from './components/form-error-boundary';
import { FormToolbar } from './components/form-toolbar';
import { EmptyState, LoadingState, ProblemState, ReadOnlyBanner } from './components/resource-list-states';
import { DocumentProblem, DocumentSnapshot, ResourceId } from './form-editor-model';
import { FormEditorMessages, FormEditorWebviewMessage } from './form-editor-messages';
import { useEditingController } from './hooks/use-editing-controller';
import { useFocusRestore } from './hooks/use-focus-restore';
import { useFocusedBlock } from './hooks/use-focused-block';
import { useFormBlocks } from './hooks/use-form-blocks';
import { useScrolledPast } from './hooks/use-scrolled-past';
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
 * document, the virtualized list of its resources and comments, and the position rail. Where
 * the document can be written, the statements of the cards are edited in place and handed to
 * the host as edits.
 */
function FormEditor(): React.JSX.Element {
	useSharedStylesheets();
	useStylesheet('mentor-form-editor', stylesheet);

	const [snapshot, setSnapshot] = useState<DocumentSnapshot>();
	const [storedViewState, setStoredViewState] = useWebviewState<unknown>(PersistedViewState.INITIAL.toJSON());
	const viewState = useMemo(() => PersistedViewState.read(storedViewState), [storedViewState]);
	const [cardStates, setCardStates] = useState(() => ResourceCardStates.fromOpenIds(PersistedViewState.read(storedViewState).openIds));
	const [filterText, setFilterText] = useState('');
	const [typeFilter, setTypeFilter] = useState<TypeFilter>();
	const [revealRequest, setRevealRequest] = useState<RevealRequest>();
	const [revealedId, setRevealedId] = useState<ResourceId>();
	const [currentId, setCurrentId] = useState<string>();
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
	const [titleElement, setTitleElement] = useState<HTMLDivElement | null>(null);
	const [railElement, setRailElement] = useState<HTMLDivElement | null>(null);
	const filterRef = useRef<VscodeTextfield>(null);
	const messagingRef = useRef<{ postMessage: (message: FormEditorWebviewMessage) => void } | undefined>(undefined);
	const revealResourceRef = useRef<(resourceId: ResourceId) => void>(undefined);
	const titleScrolledPast = useScrolledPast(scrollElement, titleElement);

	// Every update starts from a state read the current way, whatever an earlier version stored.
	const updateViewState = useCallback((changes: ViewStateChanges) => {
		setStoredViewState((current: unknown) => PersistedViewState.read(current).with(changes).toJSON());
	}, [setStoredViewState]);

	const dataService = useMemo(() => new ResourceDataService(ids => messagingRef.current?.postMessage({ id: 'RequestResources', ids })), []);
	const hostService = useMemo(() => new EditingHostService(message => messagingRef.current?.postMessage(message)), []);
	const controller = useMemo(() => new EditingController(hostService), [hostService]);
	const editingState = useEditingController(controller);
	const focusedBlockId = useFocusedBlock(scrollElement);

	const onMessage = useCallback((message: FormEditorMessages) => {
		switch (message.id) {
			case 'DocumentSnapshot':
				dataService.setVersion(message.snapshot.version);
				hostService.setVersion(message.snapshot.version);
				setSnapshot(message.snapshot);
				break;
			case 'ResourcesLoaded':
				dataService.accept(message.version, message.resources, message.missing);
				controller.settleDelivered(message.version, message.resources.map(resource => resource.id));
				break;
			case 'EditApplied':
			case 'EditRejected':
				hostService.accept(message);
				break;
			case 'ScrollToResource':
				revealResourceRef.current?.(message.resourceId);
				break;
			case 'FilterResources':
				setTypeFilter({ label: message.label, resourceIds: new Set(message.resourceIds) });
				break;
			default:
				break;
		}
	}, [dataService, hostService, controller]);

	const messaging = useWebviewMessaging<FormEditorMessages>(onMessage);

	useEffect(() => {
		messagingRef.current = messaging;
		messaging?.postMessage({ id: 'Ready' });
	}, [messaging]);

	const post = useCallback((message: FormEditorWebviewMessage) => messagingRef.current?.postMessage(message), []);

	// The declared prefixes read the predicates and resources typed into the rows.
	const namespaces = snapshot?.namespaces;

	useEffect(() => {
		controller.setNamespaces(Object.fromEntries((namespaces ?? []).map(namespace => [namespace.prefix, namespace.iri])));
	}, [controller, namespaces]);

	// The open cards belong to a document: when the webview is reused for another, they are dropped.
	const documentUri = snapshot?.uri;

	useEffect(() => {
		if (documentUri !== undefined && viewState.documentUri !== documentUri) {
			setCardStates(ResourceCardStates.NONE);
			setTypeFilter(undefined);
			updateViewState({ documentUri, openIds: [] });
		}
		// Only when the document changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [documentUri]);

	// The open cards are remembered as they change.
	useEffect(() => {
		const openIds = cardStates.openIds();

		if (!_sameIds(viewState.openIds, openIds)) {
			updateViewState({ openIds });
		}
	}, [cardStates, viewState.openIds, updateViewState]);

	const handleToggle = useCallback((resourceId: string) => {
		if (cardStates.stateOf(resourceId).open === 'collapsed') {
			dataService.request([resourceId]);
		}

		setRevealedId(undefined);
		setCardStates(current => current.toggle(resourceId));
	}, [cardStates, dataService]);

	const declarationsHidden = viewState.hideExternalDeclarations === true;
	const listFilter = useMemo(() => new ResourceListFilter({ text: filterText, type: typeFilter, hideExternalDeclarations: declarationsHidden }), [filterText, typeFilter, declarationsHidden]);
	const filtering = listFilter.hasText || typeFilter !== undefined;
	const visibleResources = useMemo(() => listFilter.apply(snapshot?.resources ?? []), [listFilter, snapshot?.resources]);
	const documentResourceId = snapshot?.documentResourceId;
	const documentResource = useMemo(() => snapshot?.resources.find(resource => resource.id === documentResourceId), [snapshot?.resources, documentResourceId]);

	// The resource describing the document heads the form; every other resource is a card.
	const listed = useMemo(() => visibleResources.filter(resource => resource.id !== documentResourceId), [visibleResources, documentResourceId]);
	const blocks = useFormBlocks(listed, snapshot?.trailingComments ?? [], filtering);

	const handleToggleExternalDeclarations = useCallback(() => {
		updateViewState({ hideExternalDeclarations: declarationsHidden ? undefined : true });
	}, [updateViewState, declarationsHidden]);

	const handleRevealResource = useCallback((resourceId: ResourceId) => {
		// A resource the filter leaves out is revealed among all of them, hidden declarations included.
		if (!visibleResources.some(resource => resource.id === resourceId)) {
			setTypeFilter(undefined);
			setFilterText('');
			updateViewState({ hideExternalDeclarations: undefined });
		}

		// The card is marked rather than opened: what it holds is the reader's to open.
		setRevealedId(resourceId);

		if (resourceId === documentResourceId) {
			scrollElement?.scrollTo({ top: 0 });
		} else {
			setRevealRequest({ resourceId });
		}
	}, [visibleResources, updateViewState, documentResourceId, scrollElement]);

	revealResourceRef.current = handleRevealResource;

	const handleRevealInTextEditor = useCallback((line: number, character: number) => post({ id: 'RevealInTextEditor', position: { line, character } }), [post]);
	const handleOpenTextEditor = useCallback(() => post({ id: 'ExecuteCommand', command: 'mentor.command.openTextEditor' }), [post]);
	const handleOpenExternal = useCallback((iri: string) => post({ id: 'ExecuteCommand', command: 'vscode.open', args: [iri] }), [post]);
	const handleRevealProblem = useCallback((problem: DocumentProblem) => handleRevealInTextEditor(problem.line, problem.character), [handleRevealInTextEditor]);

	// The filter is the find of the form.
	const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
			event.preventDefault();
			filterRef.current?.focus();
		}
	}, []);

	// Nothing is edited in a document that cannot be written back.
	const editable = snapshot !== undefined && snapshot.readOnly === undefined;

	useFocusRestore(scrollElement, editingState.focusRequest, () => controller.focusFulfilled());

	// The card holding the focus or about to take it stays mounted while it is scrolled out of view.
	const pinnedIds = useMemo(() => new Set([focusedBlockId, editingState.focusRequest?.resourceId].filter((id): id is string => id !== undefined)), [focusedBlockId, editingState.focusRequest]);

	const context: FormEditorContextValue = useMemo(() => ({
		readOnly: !editable,
		editing: editable ? controller : undefined,
		namespaces: snapshot?.namespaces ?? [],
		resources: snapshot?.resources,
		activeLanguage: snapshot?.activeLanguage,
		annotationScheme: snapshot?.annotationScheme,
		onRevealInTextEditor: handleRevealInTextEditor,
		onRevealResource: handleRevealResource,
		onOpenExternal: handleOpenExternal,
		revealedResourceId: revealedId,
		dominantTypeIri: snapshot?.dominantTypeIri,
		filterText
	// The controller is one object throughout; its state changing is what makes the rows read it anew.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}), [snapshot, editable, controller, editingState, handleRevealInTextEditor, handleRevealResource, handleOpenExternal, revealedId, filterText]);

	if (!snapshot) {
		return (
			<div className="form-editor">
				<LoadingState />
			</div>
		);
	}

	const blocking = snapshot.readOnly !== undefined && snapshot.resources.length === 0;
	const current = currentId ? listed.find(resource => resource.id === currentId) : undefined;

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
													onToggle={handleToggle}
													revealRequest={revealRequest}
													railElement={railElement}
													filtering={filtering}
													onCurrentChange={setCurrentId}
												/>
											)}
									</div>
								</div>
								<div className="form-editor-rail" ref={setRailElement} />
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
 * Indicate whether two lists of identifiers hold the same identifiers in the same order.
 * @param first The first list.
 * @param second The second list.
 * @returns `true` when they are the same.
 */
function _sameIds(first: readonly string[], second: readonly string[]): boolean {
	return first.length === second.length && first.every((id, index) => id === second[index]);
}

const root = createRoot(document.getElementById('root')!);
root.render(<FormEditor />);
