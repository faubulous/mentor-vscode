import { TurtleTokenProvider } from "@src/languages/turtle/turtle-token-provider";

export class TrigTokenProvider extends TurtleTokenProvider {
	protected override getLanguages(): string[] {
		return ['trig'];
	}
}