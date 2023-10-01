import * as fs from 'fs';

export class IconFactory {
	private _namespaces: { [key: string]: string } = {};

	constructor(iconPath: string) {
		this._createVariations(iconPath);
	}

	private _createVariations(iconPath: string) {
		if(fs.existsSync(iconPath)) {
			const data = fs.readFileSync(iconPath, 'utf8');
		}
	}
}