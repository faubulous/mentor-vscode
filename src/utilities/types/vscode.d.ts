declare type WebviewApi = {
	postMessage: (msg: any) => void;
	setState: (state: any) => void;
	getState: () => any;
};

declare function acquireVsCodeApi(): WebviewApi;