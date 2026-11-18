import { describe, expect, it, vi } from 'vitest';
import { collectItems, collectPages } from './pagination';

interface Page {
    entries?: string[];
    cursor?: string;
}

async function* asPaginator(pages: Page[]): AsyncGenerator<Page> {
    for (const page of pages) yield page;
}

describe('collectItems', () => {
    it('flattens the items of every page in order', async () => {
        const pages = asPaginator([{ entries: ['a', 'b'] }, { entries: ['c'] }]);

        await expect(collectItems(pages, page => page.entries)).resolves.toEqual(['a', 'b', 'c']);
    });

    it('treats a page without items as empty', async () => {
        const pages = asPaginator([{}, { entries: ['a'] }]);

        await expect(collectItems(pages, page => page.entries)).resolves.toEqual(['a']);
    });
});

describe('collectPages', () => {
    it('follows the token until it runs out and flattens every page', async () => {
        const fetchPage = vi
            .fn<(token?: string) => Promise<Page>>()
            .mockResolvedValueOnce({ entries: ['a'], cursor: 'two' })
            .mockResolvedValueOnce({ entries: ['b'], cursor: 'three' })
            .mockResolvedValueOnce({ entries: ['c'] });

        const items = await collectPages(
            fetchPage,
            page => page.entries,
            page => page.cursor
        );

        expect(items).toEqual(['a', 'b', 'c']);
        expect(fetchPage.mock.calls).toEqual([[undefined], ['two'], ['three']]);
    });

    it('treats a page without items as empty', async () => {
        const fetchPage = vi.fn<(token?: string) => Promise<Page>>().mockResolvedValue({});

        await expect(
            collectPages(
                fetchPage,
                page => page.entries,
                page => page.cursor
            )
        ).resolves.toEqual([]);
    });
});
