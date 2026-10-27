import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useWebviewMessaging } from '@src/views/webviews/hooks';
import { useSharedStylesheets } from '@src/views/webviews/hooks/use-shared-stylesheets';
import { DocumentSnapshot } from './form-editor-model';
import { FormEditorMessages } from './form-editor-messages';

/**
 * The form based editor for RDF documents. Until the resource list arrives, the editor shows
 * what the host sends it: the resources of the document as a plain list.
 */
function FormEditor() {
	useSharedStylesheets();

	const [snapshot, setSnapshot] = useState<DocumentSnapshot>();

	const onMessage = useCallback((message: FormEditorMessages) => {
		if (message.id === 'DocumentSnapshot') {
			setSnapshot(message.snapshot);
		}
	}, []);

	const messaging = useWebviewMessaging<FormEditorMessages>(onMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'Ready' });
	}, [messaging]);

	if (!snapshot) {
		return <p>Loading…</p>;
	}

	return (
		<main>
			<h1>{snapshot.fileName}</h1>
			{snapshot.readOnly && <p role="alert">{snapshot.readOnly.message}</p>}
			<ul>
				{snapshot.resources.map(resource => (
					<li key={resource.id}>{resource.label}</li>
				))}
			</ul>
		</main>
	);
}

const root = createRoot(document.getElementById('root')!);
root.render(<FormEditor />);
