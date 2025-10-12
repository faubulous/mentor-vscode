# Webviews

This folder contains reusable infrastructure and components for building Mentor webviews (both sidebar/panel Views and editor Panels), plus concrete implementations like the SPARQL Results and SPARQL Endpoint UI.

## Goals

- Make adding a new webview fast and low‑risk
- Unify lifecycle for Views and Panels
- Strongly‑typed messaging end‑to‑end
- Centralized HTML/CSP and asset wiring

## Key pieces

- `webview-controller.ts`: Base class that unifies creation of a sidebar/panel View (WebviewView) and an editor Panel (WebviewPanel), plus message wiring. Subclass this for each feature.
- `webview-component-factory.ts`: Central HTML/options provider. Ensures consistent includes (codicon.css, vscode-elements.js, your bundle).
- `webview-messaging.ts` and `webview-host.ts`: Thin messaging and state helpers used by the TSX client.
- `webview-component.tsx`: React base class for client components with simple message and style helpers.
- `registry.ts`: Central registry to register all controllers from one place.

## Conventions

- Each webview has a bundle built into `out/` (e.g. `sparql-connection-view.js`). The controller references it via `componentPath` and the factory generates the final HTML.
- Use a per-webview `*Messages` union type to keep messages discoverable and typed.

## Create a new webview (checklist)

1) Create your TSX client component
- Add `src/webviews/<name>/<name>-view.tsx` (or `index.tsx`) exporting a React component based on `WebviewComponent`.
- Optionally add `*.css` and import it from the TSX (CSS is bundled as text and injected by your component if desired).

2) Define messages
- Add `src/webviews/<name>/<name>-messages.ts` with a discriminated union for all message IDs between host and webview.

3) Create a controller
- Add `src/webviews/<name>/<name>-controller.ts` extending `WebviewController<M>` and pass:
  - `componentPath`: your built bundle, e.g. `'<name>-view.js'`
  - `viewType`: if this should be contributed as a sidebar/panel View
  - `panelId` and `panelTitle`: if this should open in the editor area as a Panel
- Implement `onDidReceiveMessage` to handle messages from the webview.
- Use `this.postMessage(...)` to send messages to the webview.

4) Register it
- Add the controller instance to `src/webviews/registry.ts`’s `controllers` array.
- In `package.json`, add a `contributes.views` entry if it’s a View so it appears in a container.

5) Open it
- For a View: focus it via `${viewType}.focus` or your command.
- For a Panel: call your controller’s `show()` (or a helper method you define) to open in the active editor area.

## Tips

- Prefer posting structured messages with clear `id` strings; keep them in a single `*Messages` type per webview.
- For shared styles, consider injecting them via `WebviewComponent.addStylesheet()` to avoid HTML template changes.
- If you support both a View and a Panel for the same feature, use a single controller class with both `viewType` and `panelId/panelTitle` set.
