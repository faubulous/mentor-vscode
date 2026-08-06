import { TurtleTokenProvider } from "@src/languages/turtle/turtle-token-provider";

/**
 * @deprecated TriG is registered by the {@link TurtleTokenProvider} itself; a
 * separate instance would duplicate every provider registration and event
 * subscription. Do not construct this in the extension activation path.
 */
export class TrigTokenProvider extends TurtleTokenProvider {
	protected override getLanguages(): string[] {
		return ['trig'];
	}
}