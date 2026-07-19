/** Run async factories with a fixed concurrency cap (avoids exhausting PHP-FPM workers). */
export async function pooledAll<T>(
  factories: Array<() => Promise<T>>,
  concurrency = 4,
): Promise<T[]> {
  if (factories.length === 0) return []
  const results = new Array<T>(factories.length)
  let next = 0
  const workers = Math.min(concurrency, factories.length)

  async function worker(): Promise<void> {
    while (true) {
      const index = next
      next += 1
      if (index >= factories.length) return
      results[index] = await factories[index]()
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}
