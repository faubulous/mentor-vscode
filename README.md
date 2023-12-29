# Mentor

Powerful editing support for RDF ontologies and knowledge graph projects in Visual Studio Code.

## Features

- Tree View for Classes, Properties and Individuals
  - RDFS and OWL reasoning
  - Quickly jump to definitions
  - Open URIs in browser
- Supports N3, Turtle, Trig and SPARQL
  - Syntax highlighting
  - Syntax validation
- Refactoring (TODO)

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

Contributions are always welcome! Please read the contribution guidelines first.

### Building
```bash
git clone https://github.com/faubulous/mentor-vscode.git
```
```bash
cd mentor-vscode
```
```bash
npm install
```
```bash
npm run build:watch
```
Start debugging.

### Packaging 
```bash
npm install --global @vscode/vsce
```

```bash
npm run package:install
```

# License
Distributed under the GPL Verison 3 License. See LICENSE for more information.