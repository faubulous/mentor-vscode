# Webviews

This folder holds the infrastructure for Mentor's webviews (sidebar and panel views, editor panels and custom editors), the shared React components and hooks, and the webviews themselves under `views/`.

## Goals

- Make adding a new webview fast and low‑risk
- Unify the lifecycle of views and panels
- Strongly‑typed messaging end‑to‑end
- Centralized HTML/CSP and asset wiring
- Component tests that run without VS Code

## Key pieces

- `webview-controller.ts`: Base class that unifies a sidebar/panel view (`WebviewView`) and an editor panel (`WebviewPanel`), plus message wiring. Handles the shared `ExecuteCommand` message. Subclass it for each feature.
- `webview-controller-registry.ts`: Registry the controllers are registered in at activation (`registerViews` in `src/extension.ts`).
- `webview-component-factory.ts`: Central HTML/options provider. Ensures consistent includes (codicon.css, vscode-elements.js, the view's bundle) for panels, views and webviews VS Code created itself, such as the panel of a custom editor (`configureWebview`).
- `webview-messaging.ts`: The base message interfaces and the shared `ExecuteCommandMessage`.
- `webview-host.ts`: Singleton over the VS Code webview API (messaging, state) for the browser side.
- `webview-router.ts`: Routes `mentor:` URIs to views.
- `hooks/`: React hooks, one file per hook: `useWebviewMessaging`, `useScopedWebviewMessaging`, `useWebviewState`, `useVscodeElementRef`, `useStylesheet`, `useSharedStylesheets`, `useDebouncedValue`.
- `components/`: Shared components such as `Badge`, `SectionHeader`, `ModalDialog` and `ScopeSelect`.
- `services/`: Host‑side services a webview is built on, such as the editing services of the form editor.
- `views/<name>/`: One folder per webview with its React entry point, messages, controller (or provider and session for a custom editor), CSS and tests.

## Conventions

- Each webview has a bundle built into `dist/` (e.g. `settings-panel.js`). The controller references it via `componentPath` and the factory generates the final HTML.
- Use a per‑webview `*Messages` union type to keep messages discoverable and typed.
- Keep the browser side free of imports from `vscode`; the DTOs that cross `postMessage` are plain JSON.

## Create a new webview (checklist)

1) Create the React entry point
- Add `src/views/webviews/views/<name>/<name>.tsx` rendering your component into `#root` with `createRoot`.
- Optionally add `*.css` and import it from the TSX; CSS is bundled as text and injected with `useStylesheet`.

2) Define messages
- Add `src/views/webviews/views/<name>/<name>-messages.ts` with a discriminated union for every message between host and webview.

3) Create a controller
- Add `src/views/webviews/views/<name>/<name>-controller.ts` extending `WebviewController<M>` and pass:
  - `componentPath`: the built bundle, e.g. `'<name>.js'`
  - `viewType`: if it is contributed as a sidebar/panel view
  - `panelId` and `panelTitle`: if it opens in the editor area as a panel
- Implement `onDidReceiveMessage` to handle messages from the webview and use `this.postMessage(...)` to answer.
- A custom editor registers a `CustomTextEditorProvider` instead and serves one session per tab; see `views/form-editor/`.

4) Register and build it
- Register the controller in `registerViews` (`src/extension.ts`) and export it from `index.ts`.
- Add a `getReactViewConfig` entry for the bundle in `build.js` and the entry point to `knip.json`.
- In `package.json`, add a `contributes.views` entry if it is a view, or `contributes.customEditors` for a custom editor.

5) Open it
- For a view: focus it via `${viewType}.focus` or your command.
- For a panel: call the controller's `show()` (or a helper you define).

## Using VS Code web components (vscode-elements)

Components from `@vscode-elements/elements` emit custom events (`change`, `vsc-tabs-select`, ...). Use the `useVscodeElementRef` hook so the listener is attached to the element and removed with it:

```tsx
import { useVscodeElementRef } from '@src/views/webviews/hooks';
import { VscodeTabs } from '@vscode-elements/elements';

function MyView() {
  const tabsRef = useVscodeElementRef<VscodeTabs>('vsc-tabs-select', (element, event) => {
    console.log('Tab changed:', event.detail.selectedIndex);
  });

  return <vscode-tabs ref={tabsRef}>...</vscode-tabs>;
}
```

The elements are typed as JSX intrinsics in `src/utilities/types/global.d.ts`.

## Hooks for functional components

```tsx
import { useWebviewMessaging, useWebviewState, useStylesheet } from '@src/views/webviews/hooks';

function MyView() {
  // Messaging with the host; the handler receives every message the host posts.
  const messaging = useWebviewMessaging<MyMessages>(message => {
    if (message.id === 'DataLoaded') {
      setData(message.data);
    }
  });

  // State that survives the webview being hidden and shown again.
  const [state, setState] = useWebviewState({ count: 0 });

  // Stylesheets injected once per page.
  useStylesheet('my-styles', myStylesheet);

  return <vscode-button onClick={() => messaging?.postMessage({ id: 'LoadData' })}>Load</vscode-button>;
}
```

## Testing webview components

Host code is tested in Node with the `vscode` mock. The browser side of a webview is tested in jsdom with [Testing Library](https://testing-library.com/): a test file named `*.test.tsx` opts into the DOM environment with a docblock on its first line and renders through `renderWebview`, which stubs the VS Code webview API and registers the `vscode-*` web components as plain elements.

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';

it('asks the host for data when clicked', async () => {
  const { host } = renderWebview<MyMessages>(<MyView />);

  await userEvent.click(screen.getByText('Load'));

  expect(host.posted).toEqual([{ id: 'LoadData' }]);

  host.receive({ id: 'DataLoaded', data: [] });
});
```

`host.posted` records what the component posted, `host.receive` delivers a host message through the window's `message` event, and `host.state` is what the component persisted. The web component stubs carry `value` and `checked` properties and a checkbox toggles on click, which is enough to drive a form. See `components/badge.test.tsx` and `hooks/use-webview-messaging.test.tsx`.

### In a real browser

What depends on the real VS Code elements, such as focus moving into their shadow DOM, the caret, slots and keyboard handling, is tested in Chromium with `npm run test:browser` (`vitest.browser.config.ts`, Playwright). A test file named `*.browser.test.tsx` renders with Testing Library and drives the page with real input from `vitest/browser`; the setup registers the elements from their bundle and applies the webview stylesheets and a dark theme. A failing test leaves a screenshot under `.vitest/`.

```tsx
import { userEvent } from 'vitest/browser';
import { render } from '@testing-library/react';

it('takes the typed text', async () => {
  const { container } = render(<MyField />);

  await userEvent.click(container.querySelector('vscode-textfield')!);
  await userEvent.keyboard('Oak{Enter}');

  expect(onSubmit).toHaveBeenCalledWith('Oak');
});
```

See `views/form-editor/components/combobox.browser.test.tsx`. CI runs these tests in a job of their own after installing Chromium (`npx playwright install --with-deps chromium`).
