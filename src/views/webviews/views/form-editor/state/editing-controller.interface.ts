import { EditWriter } from './edit-writer';

/**
 * What the editable rows need from whoever hosts them: a way to write. The form editor implements
 * it over the webview message channel; a host without write-back provides none, and the form is
 * read-only.
 */
export interface IEditingController {
	/**
	 * Ask for a writer to be written once it can be. Writes go out one at a time and in the order
	 * asked for, each built when it is sent, from data of the version it is sent against.
	 * @param writer The writer.
	 */
	requestWrite(writer: EditWriter): void;

	/**
	 * Send the writes whose data has become current since they were asked for.
	 */
	flush(): void;
}
