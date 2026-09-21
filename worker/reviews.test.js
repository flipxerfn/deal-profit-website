// Deal Profit — review flow tests.
// Covers validation, review record creation, public projection, and summary math.
// Run with: node --test worker/reviews.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReview,
  makeReview,
  toPublicReview,
  reviewSummary,
  REVIEW_NAME_MIN,
  REVIEW_TEXT_MAX,
} from './reviews.js';

test('validateReview accepts a valid submission', () => {
  const { value, error } = validateReview({
    name: '  Penny Hunter  ',
    rating: '5',
    text: '  Found a great glitch deal today! ',
  });
  assert.equal(error, undefined);
  assert.equal(value.name, 'Penny Hunter');
  assert.equal(value.text, 'Found a great glitch deal today!');
  assert.equal(value.rating, 5);
  assert.equal(value.category, null);
});

test('validateReview rejects missing / too-short names', () => {
  assert.equal(validateReview({}).error, 'name_short');
  assert.equal(validateReview({ name: 'A', rating: 5, text: 'okay' }).error, 'name_short');
  assert.equal(validateReview({ name: '   ', rating: 5, text: 'okay' }).error, 'name_short');
  assert.equal(validateReview({ name: null, rating: 5, text: 'okay' }).error, 'name_short');
});

test('validateReview rejects missing / too-short review text', () => {
  assert.equal(validateReview({ name: 'Bill', rating: 5 }).error, 'text_short');
  assert.equal(validateReview({ name: 'Bill', rating: 5, text: 'ab' }).error, 'text_short');
  assert.equal(validateReview({ name: 'Bill', rating: 5, text: '  ' }).error, 'text_short');
});

test('validateReview rejects ratings outside 1-5 and non-integers', () => {
  assert.equal(validateReview({ name: 'Bill', rating: 0, text: 'okay' }).error, 'rating_invalid');
  assert.equal(validateReview({ name: 'Bill', rating: 6, text: 'okay' }).error, 'rating_invalid');
  assert.equal(validateReview({ name: 'Bill', rating: 3.5, text: 'okay' }).error, 'rating_invalid');
  assert.equal(validateReview({ name: 'Bill', rating: 'x', text: 'okay' }).error, 'rating_invalid');
  assert.equal(validateReview({ name: 'Bill', rating: null, text: 'okay' }).error, 'rating_invalid');
});

test('validateReview accepts only whitelisted categories', () => {
  assert.equal(validateReview({ name: 'Bill', rating: 5, text: 'okay', category: 'deals' }).value.category, 'deals');
  assert.equal(validateReview({ name: 'Bill', rating: 5, text: 'okay', category: 'alerts' }).value.category, 'alerts');
  assert.equal(validateReview({ name: 'Bill', rating: 5, text: 'okay', category: 'community' }).value.category, 'community');
  assert.equal(validateReview({ name: 'Bill', rating: 5, text: 'okay', category: 'spam' }).value.category, null);
});

test('validateReview truncates long text to the storage limit', () => {
  const long = 'x'.repeat(REVIEW_TEXT_MAX + 500);
  const { value, error } = validateReview({ name: 'Bill', rating: 5, text: long });
  assert.equal(error, undefined);
  assert.equal(value.text.length, REVIEW_TEXT_MAX);
});

test('malformed / non-object payloads fail validation cleanly', () => {
  assert.equal(validateReview(null).error, 'name_short');
  assert.equal(validateReview(undefined).error, 'name_short');
  assert.equal(validateReview('nope').error, 'name_short');
  assert.equal(validateReview(42).error, 'name_short');
});

test('makeReview creates a pending record with timestamps and featured=false', () => {
  const { value } = validateReview({ name: 'Sam', rating: 3, text: 'decent' });
  const review = makeReview(value, 'rv-test-1');
  assert.equal(review.id, 'rv-test-1');
  assert.equal(review.status, 'pending');
  assert.equal(review.featured, false);
  assert.equal(typeof review.createdAt, 'string');
  assert.equal(review.createdAt, review.updatedAt);
  assert.equal(review.name, 'Sam');
  assert.equal(review.rating, 3);
});

test('toPublicReview strips moderation fields', () => {
  const { value } = validateReview({ name: 'Sam', rating: 3, text: 'decent', category: 'alerts' });
  const review = makeReview(value, 'rv-test-1');
  const pub = toPublicReview(review);
  assert.equal(pub.status, undefined);
  assert.equal(pub.updatedAt, undefined);
  assert.deepEqual(Object.keys(pub).sort(), ['category', 'createdAt', 'featured', 'id', 'name', 'rating', 'text']);
  assert.equal(pub.featured, false);
});

test('reviewSummary handles no approved reviews', () => {
  const pending = makeReview(validateReview({ name: 'Sam', rating: 5, text: 'ok' }).value, '1');
  const rejected = makeReview(validateReview({ name: 'Jo', rating: 1, text: 'ok' }).value, '2');
  rejected.status = 'rejected';
  const s = reviewSummary([pending, rejected]);
  assert.equal(s.count, 0);
  assert.equal(s.average, null);
  assert.equal(s.featured, null);
});

test('reviewSummary averages approved ratings and rounds to 1 decimal', () => {
  const mk = (rating, featured = false) => {
    const r = makeReview(validateReview({ name: 'Sam', rating, text: 'okay' }).value, `rv-${rating}`);
    r.status = 'approved';
    r.featured = featured;
    return r;
  };
  const s = reviewSummary([mk(5), mk(4)]);
  assert.equal(s.count, 2);
  assert.equal(s.average, 4.5);
  assert.equal(s.featured, null);

  const s2 = reviewSummary([mk(5), mk(5), mk(4)]);
  assert.equal(s2.average, 4.7);
});

test('reviewSummary picks the first approved+featured review', () => {
  const mk = (name, rating, featured) => {
    const r = makeReview(validateReview({ name, rating, text: 'okay' }).value, `rv-${name}`);
    r.status = 'approved';
    r.featured = featured;
    return r;
  };
  const s = reviewSummary([mk('Aaron', 5, false), mk('Beth', 2, true), mk('Chaz', 4, false)]);
  assert.equal(s.featured.name, 'Beth');
  // featured review is also counted in average
  assert.equal(s.count, 3);
});

test('ensure minimum name constant matches frontend guard', () => {
  // Frontend requires a 2+ char display name; the server uses REVIEW_NAME_MIN.
  assert.equal(REVIEW_NAME_MIN, 2);
});