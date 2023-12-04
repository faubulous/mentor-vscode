import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";

// In order to use all the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(allComponents);

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main);

function main() {
  // // Set checkbox indeterminate state
  // const checkbox = document.getElementById("basic-checkbox") as Checkbox;
  // checkbox.indeterminate = true;

  // Define data grid with custom titles
  const basicDataGridList = document.querySelectorAll(".basic-grid") as NodeListOf<DataGrid>;

  for (const basicDataGrid of basicDataGridList) {
    basicDataGrid.rowsData = [
      {
        columnKey1: "#ff0000",
        columnKey2: "Cell Data",
        columnKey3: "Cell Data",
      },
      {
        columnKey1: "#00ff00",
        columnKey2: "Cell Data",
        columnKey3: "Cell Data",
      },
      {
        columnKey1: "#0000ff",
        columnKey2: "Cell Data",
        columnKey3: "Cell Data",
      },
    ];

    basicDataGrid.columnDefinitions = [
      { columnDataKey: "columnKey1", title: "Color" },
      { columnDataKey: "columnKey2", title: "Prefix" },
      { columnDataKey: "columnKey3", title: "URI" }
    ];
  }
}
