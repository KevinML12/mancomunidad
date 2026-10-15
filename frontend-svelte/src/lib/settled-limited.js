export async function settledLimited(tasks, limit = 3) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('El límite debe ser un entero positivo');
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      try { results[index] = { status: 'fulfilled', value: await tasks[index]() }; }
      catch (reason) { results[index] = { status: 'rejected', reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
