import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { WebviewControllerRegistry } from '@src/views/webviews';

export const showWebview = {
  id: 'mentor.webview.show',
  handler: async (arg?: { id?: string } | string) => {
    const registry = container.resolve<WebviewControllerRegistry>(ServiceToken.WebviewControllerRegistry);
    const targets = registry.collectTargets();
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

    const controller = registry.findById(selectedView.id);

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
};

type Target = { kind: 'panel' | 'view'; id: string; label: string };