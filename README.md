# Mentor RDF for Visual Studio Code
[![License: GPL-V3](https://img.shields.io/badge/license-GPL3-brightgree)](./LICENSE)

This extension provides powerful editing support for RDF ontologies and knowledge graph projects in Visual Studio Code.

<img src="media/screenshot.png" alt="The Mentor extension showing the workspace explorer and the ontology definitions tree view.">

## Features
> **Tip:** Try it with <a href="https://marketplace.visualstudio.com/items?itemName=GitHub.copilot">GitHub Copilot</a> for the best code editing experience.

This extension provides the following features:

- **Workspace Tree**
  - Navigate all ontology and SPARQL files in the project
  - Easily find problems in all ontologies in the workspace
- **Workspace Index**
  - Creates an index of all ontologies in the workspace
  - Find all references to a subject in the workspace
  - Provides code lenses that show reference statistics for a subject
- **Ontology Tree**
  - Showing definitions of classes, properties and individuals
  - Quickly jump to definitions
  - RDFS and limited OWL reasoning
  - Find all references in the current document
  - Open URIs in browser
- **Supports N3, Turtle, Trig and SPARQL**
  - Syntax highlighting
  - Syntax validation
  - Checking conformance of literal values to XSD specifications
  - Checking if namespace IRIs end with separator (`/`,`#`, `:`)
- **Refactoring**
  - Rename prefixes
  - Rename resource labels in prefixed names and URIs

## News
### Version 0.1.6: Bugfixes
A minor bugfix release. Next release will feature an improved definitions tree view and SKOS support.
- Fixed syntax support for TriG files
- Fixed wrong reference counts in code lenses after opening a file in a Git diff view

### Version 0.1.5: Prefix Definition Support
Added inline completion support for prefix definitions and quick fixes for implementing missing prefix definitions. The prefix URIs are resolved from the indexed files in the workspace as well as from a local database downloaded from prefix.cc. The local database can be updated manually using a built-in command.

### Version 0.1.3: Global Workspace Index
Added support for indexing all ontology files in the workspace. This enables finding references, retrieving descriptions and going to defintions of subjects accross the entire workspace. A newly added code lens shows the number of references of a subject in the workspace. In addition, the workspace tree gained a new command for opening all the ontologies in the workspace to identify problems and show them in the problems tab.

## Installation

You can install the Mentor extension directly from the [Visual Studio Code marketplace](https://marketplace.visualstudio.com/VSCode). Follow these steps:

1. Open Visual Studio Code.
2. Click on the Extensions view icon on the Sidebar (or press `Ctrl+Shift+X`).
3. In the Extensions view, enter `Mentor` in the search form and press `Enter`.
4. Locate the Mentor extension in the search results and click on the install button.

Alternatively, if you have the `.vsix` file of the extension, you can install it manually:

1. Open Visual Studio Code.
2. Click on the Extensions view icon on the Sidebar.
3. Click on the `...` at the top of the Extensions view, select `Install from VSIX...`.
4. Locate the `.vsix` file and click `Open`.

After installation, you may need to reload Visual Studio Code to activate the extension.

## Contributing

Contributions are always welcome! To start off, fork this repository on GitHub and then clone the fork to your local computer.

### Building

Once cloned, add an upstream remote pointing to the primary toolkit repo.

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

```bash
npm run package:install
```

# License
Distributed under the [GPL Version 3 License](LICENSE). See LICENSE for more information.