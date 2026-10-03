// Bounded process-local protection; use a shared limit at the gateway for multiple replicas.
export function rateLimit(max, intervalMs = 15 * 60_000) {
 const buckets = new Map();
 return (req,res,next) => {
  const now=Date.now();const key=req.ip;
  if (buckets.size >= 10000) for (const [id,bucket] of buckets) if (bucket.until < now) buckets.delete(id);
  let bucket=buckets.get(key);
  if (!bucket || bucket.until < now) { bucket={count:0,until:now+intervalMs}; if(buckets.size >= 10000) return res.status(429).json({error:'Intente más tarde'});buckets.set(key,bucket); }
  if (++bucket.count > max) return res.status(429).json({error:'Demasiadas solicitudes. Intente más tarde'});
  next();
 };
}
