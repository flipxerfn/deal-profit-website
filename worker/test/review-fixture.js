// Test-only: read/seed review records in the mock Durable Object KV.
export function readReviews(env) {
  const raw = env.__kv.get('admin:reviews');
  return raw ? JSON.parse(raw) : [];
}

export function putReview(env, review) {
  const all = readReviews(env);
  const idx = all.findIndex((r) => r.id === review.id);
  if (idx === -1) all.push(review);
  else all[idx] = review;
  env.__kv.set('admin:reviews', JSON.stringify(all));
  return review;
}
