// Deal Profit — review record helpers (validation, shape, public projection).
// Pure functions only; I/O (storage, sessions) lives in the worker.

export const REVIEW_CATEGORIES = ['deals', 'alerts', 'community'];
export const REVIEW_NAME_MIN = 2;
export const REVIEW_NAME_MAX = 40;
export const REVIEW_TEXT_MIN = 3;
export const REVIEW_TEXT_MAX = 1000;
export const REVIEW_MAX_STORED = 500;

const cleanStr = (value, max) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export function validateReview(body) {
  const payload = body ?? {};
  const name = cleanStr(payload.name, REVIEW_NAME_MAX);
  const text = cleanStr(payload.text, REVIEW_TEXT_MAX);
  if (name.length < REVIEW_NAME_MIN) return { error: 'name_short' };
  if (text.length < REVIEW_TEXT_MIN) return { error: 'text_short' };
  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'rating_invalid' };
  const category = REVIEW_CATEGORIES.includes(payload.category) ? payload.category : null;
  return { value: { name, text, rating, category } };
}

export function makeReview(values, id) {
  const now = new Date().toISOString();
  return {
    id,
    ...values,
    status: 'pending',
    featured: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function toPublicReview(review) {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    text: review.text,
    category: review.category ?? null,
    featured: review.featured === true,
    createdAt: review.createdAt,
  };
}

export function reviewSummary(reviews) {
  const approved = reviews.filter((r) => r.status === 'approved');
  if (approved.length === 0) {
    return { count: 0, average: null, featured: null };
  }
  const total = approved.reduce((sum, r) => sum + Number(r.rating), 0);
  const average = Math.round((total / approved.length) * 10) / 10;
  const featured = approved.find((r) => r.featured === true) ?? null;
  return { count: approved.length, average, featured: featured ? toPublicReview(featured) : null };
}