declare type VsCodeWebviewApi = {
	postMessage: (msg: any) => void;
	setState: (state: any) => void;
	getState: () => any;
};

declare function acquireVsCodeApi(): VsCodeWebviewApi;