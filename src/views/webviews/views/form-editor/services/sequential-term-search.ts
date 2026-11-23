import { ResourceOptionData, TermSearchTargetType } from '../form-editor-model';
import { ITermSearchService } from './term-search-service.interface';

/**
 * Searches the terms of one picker as it is typed into: each text is searched at once while no
 * search is on its way, else once the search on its way is answered, and then only the text typed
 * last. So the host never works through texts the picker has moved on from, however fast it is
 * typed into or however slow the host answers.
 */
export class SequentialTermSearch {
	private _searching = false;

	private _waiting?: string;

	private _disposed = false;

	/**
	 * Create the search of a picker.
	 * @param _service Searches the terms.
	 * @param _targetType The type of terms the picker offers.
	 * @param _limit How many terms are asked for.
	 * @param _onAnswer Called with each answer and the text it is for.
	 */
	constructor(
		private readonly _service: ITermSearchService,
		private readonly _targetType: TermSearchTargetType,
		private readonly _limit: number,
		private readonly _onAnswer: (text: string, options: readonly ResourceOptionData[]) => void
	) { }

	/**
	 * Search a text, now or once the search on its way is answered.
	 * @param text The typed text.
	 */
	request(text: string): void {
		if (this._searching) {
			this._waiting = text;
		} else {
			this._send(text);
		}
	}

	/**
	 * Stop answering, as once the picker is gone.
	 */
	dispose(): void {
		this._disposed = true;
		this._waiting = undefined;
	}

	/**
	 * Send a search, and once it is answered the text typed meanwhile.
	 * @param text The typed text.
	 */
	private _send(text: string): void {
		this._searching = true;

		void this._service.search(this._targetType, text, this._limit).then(options => {
			this._searching = false;

			if (this._disposed) {
				return;
			}

			this._onAnswer(text, options);

			const waiting = this._waiting;

			this._waiting = undefined;

			if (waiting !== undefined && waiting !== text) {
				this._send(waiting);
			}
		});
	}
}
