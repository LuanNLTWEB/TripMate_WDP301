import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Review from '../src/models/Review.js';
import Tour from '../src/models/Tour.js';
import {
  calculateTripEndDate,
  createReview,
  getReviewEligibility,
  parseTourDurationDays
} from '../src/controllers/reviewController.js';

const originalBookingFind = Booking.find;
const originalReviewCreate = Review.create;
const originalReviewFind = Review.find;
const originalReviewFindOne = Review.findOne;
const originalTourFindById = Tour.findById;
const originalTourFindByIdAndUpdate = Tour.findByIdAndUpdate;

afterEach(() => {
  Booking.find = originalBookingFind;
  Review.create = originalReviewCreate;
  Review.find = originalReviewFind;
  Review.findOne = originalReviewFindOne;
  Tour.findById = originalTourFindById;
  Tour.findByIdAndUpdate = originalTourFindByIdAndUpdate;
});

const createResponse = () => {
  const output = { statusCode: 200, body: null };
  output.response = {
    status(code) {
      output.statusCode = code;
      return this;
    },
    json(body) {
      output.body = body;
      return this;
    }
  };
  return output;
};

const mockBookingFind = (records, capture = {}) => {
  Booking.find = (query) => {
    capture.query = query;
    return {
      sort(sortValue) {
        capture.sort = sortValue;
        return Promise.resolve(records);
      }
    };
  };
};

const makeRequest = (body = {}) => ({
  params: { tourId: 'tour-1' },
  user: { _id: 'customer-1', role: 'customer' },
  body
});

test('parses Vietnamese and English tour durations with a safe fallback', () => {
  assert.equal(parseTourDurationDays('3 ngày 2 đêm'), 3);
  assert.equal(parseTourDurationDays('5 days 4 nights'), 5);
  assert.equal(parseTourDurationDays('Trong ngày'), 1);
  assert.equal(parseTourDurationDays('999 ngày'), 365);
});

test('calculates review eligibility from the day after the full tour duration', () => {
  const endDate = calculateTripEndDate('2026-10-01T00:00:00.000Z', '3 ngày 2 đêm');
  assert.equal(endDate.toISOString(), '2026-10-04T00:00:00.000Z');
});

test('returns booking_not_confirmed when customer has no confirmed booking', async () => {
  let bookingCapture = {};
  Tour.findById = async () => ({ _id: 'tour-1', duration: '2 ngày 1 đêm' });
  Review.findOne = async () => null;
  mockBookingFind([], bookingCapture);
  const result = createResponse();

  await getReviewEligibility(makeRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.eligible, false);
  assert.equal(result.body.data.reason, 'booking_not_confirmed');
  assert.deepEqual(bookingCapture.query, {
    tourId: 'tour-1',
    customerId: 'customer-1',
    status: 'confirmed'
  });
});

test('returns the next eligibility date while a confirmed trip is not completed', async () => {
  Tour.findById = async () => ({ _id: 'tour-1', duration: '2 ngày 1 đêm' });
  Review.findOne = async () => null;
  mockBookingFind([
    { _id: 'booking-1', departureDate: new Date('2099-06-10T00:00:00.000Z') }
  ]);
  const result = createResponse();

  await getReviewEligibility(makeRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.eligible, false);
  assert.equal(result.body.data.reason, 'trip_not_completed');
  assert.equal(result.body.data.eligibleAt.toISOString(), '2099-06-12T00:00:00.000Z');
});

test('creates an approved review after a confirmed trip and recalculates tour rating', async () => {
  let createdPayload;
  let ratingUpdate;
  Tour.findById = async () => ({ _id: 'tour-1', duration: '3 ngày 2 đêm' });
  Review.findOne = async () => null;
  mockBookingFind([
    { _id: 'booking-1', departureDate: new Date('2020-01-01T00:00:00.000Z') }
  ]);
  Review.create = async (payload) => {
    createdPayload = payload;
    return {
      _id: 'review-1',
      ...payload,
      async populate() {
        this.userId = { _id: payload.userId, username: 'Phúc' };
        return this;
      }
    };
  };
  Review.find = (query) => ({
    async select(fields) {
      assert.deepEqual(query, { tourId: 'tour-1', status: 'approved' });
      assert.equal(fields, 'rating');
      return [{ rating: 5 }, { rating: 4 }];
    }
  });
  Tour.findByIdAndUpdate = async (tourId, update) => {
    ratingUpdate = { tourId, update };
  };
  const result = createResponse();

  await createReview(makeRequest({
    rating: 5,
    comment: 'Một chuyến đi rất đáng nhớ.'
  }), result.response);

  assert.equal(result.statusCode, 201);
  assert.deepEqual(createdPayload, {
    userId: 'customer-1',
    tourId: 'tour-1',
    rating: 5,
    comment: 'Một chuyến đi rất đáng nhớ.',
    status: 'approved'
  });
  assert.deepEqual(ratingUpdate, {
    tourId: 'tour-1',
    update: { averageRating: 4.5 }
  });
  assert.equal(result.body.totalReviews, 2);
  assert.equal(result.body.averageRating, 4.5);
  assert.equal(result.body.data.userId.username, 'Phúc');
});

test('rejects another review when the customer already reviewed the tour', async () => {
  let bookingLookupCalled = false;
  Tour.findById = async () => ({ _id: 'tour-1', duration: '1 ngày' });
  Review.findOne = async () => ({ _id: 'existing-review' });
  Booking.find = () => {
    bookingLookupCalled = true;
    return { sort: async () => [] };
  };
  const result = createResponse();

  await createReview(makeRequest({
    rating: 4,
    comment: 'Nội dung đánh giá hợp lệ.'
  }), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.reason, 'already_reviewed');
  assert.equal(bookingLookupCalled, false);
});

test('rejects review creation until a confirmed trip has ended', async () => {
  Tour.findById = async () => ({ _id: 'tour-1', duration: '4 ngày 3 đêm' });
  Review.findOne = async () => null;
  mockBookingFind([
    { _id: 'booking-1', departureDate: new Date('2099-12-01T00:00:00.000Z') }
  ]);
  const result = createResponse();

  await createReview(makeRequest({
    rating: 5,
    comment: 'Tôi sẽ đánh giá sau chuyến đi.'
  }), result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.reason, 'trip_not_completed');
  assert.equal(result.body.eligibleAt.toISOString(), '2099-12-05T00:00:00.000Z');
});
