# Mentor
[![License: GPL-V3](https://img.shields.io/badge/license-GPL3-brightgreen)](./LICENSE) [![Website](https://img.shields.io/badge/website-mentor--vscode.dev-blue)](https://mentor-vscode.dev)

The developer friendly IDE for RDF knowledge graphs.

<img src="https://raw.githubusercontent.com/faubulous/mentor-vscode.dev/main/public/screenshots/window.png" alt="The Mentor extension showing the workspace explorer and the ontology definitions tree view.">


## Features:

- **Workspace Management**
  - Fast indexing, cross-file references, code lenses and quick navigation to definitions.
- **Content Navigation**
  - Browsable definition trees for RDFS / OWL / SHACL / SKOS
  - Structural reasoning and multilingual labels.
- **Syntax Highlighting & Validation**
  - N3 / Turtle / TriG / RDF-XML and SPARQL.
- **Editing**
  - Repository wide auto-complete
  - Built in prefix.cc support for namespace lookups
- **Refactoring**
  - Refactor prefixed names and IRIs
  - Auto-implement / sort / remove prefixes
- **Notebooks && SPARQL**
  - Built-in triple store for all files in the workspace.
  - Run queries against remote endpoints or workspace files.
  - Interactive notebooks with support for Markdown, RDF data and SPARQL queries.
- **Collaboration**
  - Runs in the browser (e.g. [`vscode.dev`](https://vscode.dev)), supports editing GitHub repositories and live collaboration.

## News
### Version 0.3.8: Service Release
- Fixes broken auto-complete support.
- Fixes missing refresh icon in SPARQL boolean query results.
- `:` prefixes in files are now implemented as `workspace:` URIs instead of `file:` to improve portability.
- Added link to mentor-vscode.dev for help

[Full Release History](https://mentor-vscode.dev/about/release-history)

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