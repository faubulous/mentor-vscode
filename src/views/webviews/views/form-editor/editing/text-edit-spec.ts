/**
 * A replacement of one range of the document text, addressed by offsets into the text the edit
 * was synthesized against. `end` is exclusive; an insertion has `start === end`.
 */
export interface TextEditSpec {
	start: number;
	end: number;
	newText: string;
}
