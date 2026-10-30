import { useEffect, useState } from 'react';

/**
 * Follow the block of the list that holds the focus, so it can stay mounted while it is scrolled
 * out of view: a row being typed into must not go before it is written.
 * @param root The element holding the blocks.
 * @returns The identifier of the block last focused, if any.
 */
export function useFocusedBlock(root: HTMLElement | null): string | undefined {
	const [blockId, setBlockId] = useState<string>();

	useEffect(() => {
		if (!root) {
			return;
		}

		const onFocusIn = (event: FocusEvent): void => {
			const target = event.target instanceof Element ? event.target : null;
			const block = target?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? undefined;

			if (block !== undefined) {
				setBlockId(block);
			}
		};

		root.addEventListener('focusin', onFocusIn);

		return () => root.removeEventListener('focusin', onFocusIn);
	}, [root]);

	return blockId;
}
