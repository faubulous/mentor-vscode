import * as vscode from 'vscode';
import { controllers } from '../webviews/registry';

type Target = { kind: 'panel' | 'view'; id: string; label: string };

function collectTargets(): Target[] {
  const items: Target[] = [];

  for (const c of controllers as any[]) {
    if (c.panelId && c.panelTitle) {
      items.push({ kind: 'panel', id: c.panelId, label: `panel: ${c.panelId}` });
    }

    if (c.viewType) {
      items.push({ kind: 'view', id: c.viewType, label: `view: ${c.viewType}` });
    }
  }

  return items;
}

export async function showWebview(arg?: { id?: string } | string) {
  const targets = collectTargets();
  const id = typeof arg === 'string' ? arg : arg?.id;

  let selectedView: Target | undefined = id
    ? targets.find(t => t.id === id)
    : await vscode.window.showQuickPick(
      targets.map(t => ({ label: t.label, description: t.id, t })),
      { title: 'Select webview to show' }
    ).then(r => r?.t);

  if (!selectedView) {
    return;
  }

  // Find controller instance
  const controller = (controllers as any[]).find(c =>
    (selectedView!.kind === 'panel' ? c.panelId === selectedView!.id : c.viewType === selectedView!.id)
  );

  if (!controller) {
    vscode.window.showErrorMessage(`Webview not found for id: ${selectedView.id}`);
    return;
  }

  if (selectedView.kind === 'panel') {
    controller.show(vscode.ViewColumn.Active);
  } else {
    await vscode.commands.executeCommand(`${selectedView.id}.focus`);
  }
}
