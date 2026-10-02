/**
 * Flatten the items of every page of an SDK paginator (`paginateXxx`).
 * `getItems` picks the data-bearing field, which differs per operation.
 */
export async function collectItems<TPage, TItem>(
    pages: AsyncIterable<TPage>,
    getItems: (page: TPage) => TItem[] | undefined
): Promise<TItem[]> {
    const items: TItem[] = [];
    for await (const page of pages) {
        items.push(...(getItems(page) ?? []));
    }
    return items;
}

/**
 * Flatten the items of every page of an operation the SDK ships no paginator
 * for, following its continuation token until the response stops returning one.
 * `fetchPage` receives `undefined` on the first call.
 */
export async function collectPages<TPage, TItem>(
    fetchPage: (token: string | undefined) => Promise<TPage>,
    getItems: (page: TPage) => TItem[] | undefined,
    getNextToken: (page: TPage) => string | undefined
): Promise<TItem[]> {
    const items: TItem[] = [];
    let token: string | undefined;
    do {
        const page = await fetchPage(token);
        items.push(...(getItems(page) ?? []));
        token = getNextToken(page);
    } while (token);
    return items;
}
