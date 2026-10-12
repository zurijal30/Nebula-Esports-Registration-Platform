/** Stable ordering belongs to the caller. Do not return partial successful lists. */
export async function allRows<T>(query: { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }> }) {
  const data: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await query.range(offset, offset + 499);
    if (page.error || !page.data) return { data: [] as T[], error: true };
    data.push(...page.data as T[]);
    if (page.data.length < 500) return { data, error: false };
  }
}
