# Mentor for Visual Studio Code
[![Website](https://img.shields.io/badge/website-mentor--vscode.dev-blue)](https://mentor-vscode.dev) [![License: GPL-V3](https://img.shields.io/badge/license-GPL3-brightgreen)](./LICENSE) [![Coverage](https://img.shields.io/endpoint?url=https://faubulous.github.io/mentor-vscode/coverage-badge.json)](https://faubulous.github.io/mentor-vscode/)

The developer friendly IDE for RDF knowledge graphs.

<img src="https://raw.githubusercontent.com/faubulous/mentor-vscode.dev/main/public/screenshots/window.png" alt="The Mentor extension showing the workspace explorer and the ontology definitions tree view.">

## Features:

- **Workspace Management**
  - Fast indexing, cross-file references, code lenses and quick navigation to definitions.
  - Settings panel to browse and manage all important Mentor settings.
  - Status bar items for index, validation and query status.
- **Content Navigation**
  - Browsable definition trees for RDFS / OWL / SHACL / SKOS
  - Structural reasoning and multilingual labels.
  - Describe IRIs and prefixed names against the connection of the current document.
- **Syntax Highlighting & Validation**
  - N-Triples / N-Quads / N3 / Turtle / TriG / RDF-XML, SPARQL and Datalog.
  - SHACL validation profiles with built-in presets for basic ontology and taxonomy hygiene.
  - Validate a single document, a profile or the entire workspace, on startup or on change.
  - SHACL reports and validation logs, extensible with custom user shapes.
- **Editing**
  - Repository wide auto-complete
  - Built in prefix.cc support for namespace lookups
  - Configurable formatting for Turtle and SPARQL documents
- **Refactoring**
  - Refactor prefixed names and IRIs
  - Auto-implement / sort / remove prefixes
  - Sort documents alphabetically, by type or semantically, clean up and inline blank nodes
  - Convert documents between N-Triples / N-Quads / Turtle / RDF-XML
- **Notebooks && SPARQL**
  - Built-in triple store for all files in the workspace.
  - Run queries against remote endpoints or workspace files.
  - Editable triple store profiles to adjust SPARQL queries and inferencing features.
  - Interactive notebooks with support for Markdown, RDF data and SPARQL queries.
- **Templating**
  - Support for the [Triplate](https://triplate.dev) templating language.
  - Create, execute and preview templates for SPARQL queries and RDF data.
- **Collaboration**
  - Runs in the browser (e.g. [`vscode.dev`](https://vscode.dev)), supports editing GitHub repositories and live collaboration.

## News

### Version 0.6.2: Windows Workspace Indexing Fix
- Fixed workspace indexing on Windows skipping every file when the workspace root and the indexed files reported the drive letter in a different case (`C:` vs `c:`)
- Files in a workspace folder outside the `.code-workspace` directory are now indexed instead of being skipped
- Indexing errors now report the raw file path, so the workspace root and a file that failed against it can be compared in the log

## Installation

You can install the Mentor extension directly from the [Visual Studio Code marketplace](https://marketplace.visualstudio.com/VSCode). Follow these steps:

1. Open Visual Studio Code.
2. Click on the Extensions view icon on the Sidebar (or press `Ctrl+Shift+X`).
3. In the Extensions view, enter `Mentor` in the search form and press `Enter`.
4. Locate the Mentor extension in the search results and click on the install button.

## Contributing
We appreciate contributions in all forms! By contributing to Mentor, you'll help make it a better tool for the RDF and knowledge graph community. Contributions can take many shapes, including:

- **Bug reports:** If you encounter an issue, please report it to us so we can investigate and fix it. Your feedback helps us understand what works well and what we can improve.

- **Reviews and feedback:** Share your experience with Mentor by leaving a review on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=faubulous.mentor).

- **Code contributions:** Help us improve the extension by submitting new features, bug fixes, or refactoring existing code.


### Building

To get started, fork this repository on GitHub and then clone the fork to your local computer. Once cloned, add an upstream remote pointing to the primary toolkit repo.

```bash
git clone https://github.com/faubulous/mentor-vscode.git
cd mentor-vscode
```

Install the project dependencies.

```bash
npm install
```

Create a development build of the extension.

```bash
npm run build:watch
```

### Debugging

To start debugging the 'Launch Extension' configuration, follow these steps:

1. Open Visual Studio Code.
2. Click on the Run view icon on the Sidebar (or press `Ctrl+Shift+D`).
3. At the top of the Run view, in the dropdown list of debug configurations, select 'Launch Extension'.
4. After the configuration is set, you can start debugging by clicking on the green 'Start Debugging' button (or press `F5`).

This will start a new instance of Visual Studio Code with the Mentor extension loaded. You can set breakpoints in your code to stop execution and inspect variables, call stack, and so on.

### Packaging 
```bash
npm install --global @vscode/vsce
```

Create a production build and install it into your local Visual Studio Code environment:
```bash
npm run package:install
```

# License
Distributed under the [GPL Version 3 License](LICENSE). See LICENSE for more information.