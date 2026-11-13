import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Review from '../src/models/Review.js';
import {
  getReportedReviews,
  moderateReview
} from '../src/controllers/reviewController.js';

const originalCountDocuments = Review.countDocuments;
const originalAggregate = Review.aggregate;
const originalFind = Review.find;
const originalFindById = Review.findById;

afterEach(() => {
  Review.countDocuments = originalCountDocuments;
  Review.aggregate = originalAggregate;
  Review.find = originalFind;
  Review.findById = originalFindById;
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

const createFindChain = (records, capture) => ({
  populate(path, fields) {
    capture.populate.push({ path, fields });
    return this;
  },
  sort(value) {
    capture.sort = value;
    return this;
  },
  skip(value) {
    capture.skip = value;
    return this;
  },
  limit(value) {
    capture.limit = value;
    return Promise.resolve(records);
  }
});

test('lists only reported reviews and populates reporter information', async () => {
  let countQuery;
  let findQuery;
  const capture = { populate: [] };
  Review.countDocuments = async (query) => {
    countQuery = query;
    return 1;
  };
  Review.aggregate = async () => [
    { _id: 'flagged', count: 2 },
    { _id: 'rejected', count: 1 }
  ];
  Review.find = (query) => {
    findQuery = query;
    return createFindChain([{ _id: 'review-1', isReported: true }], capture);
  };

  const result = createResponse();
  await getReportedReviews({ query: { status: 'flagged', page: 1, limit: 10 } }, result.response);

  assert.deepEqual(countQuery, { isReported: true, isDeleted: false, status: 'flagged' });
  assert.deepEqual(findQuery, { isReported: true, isDeleted: false, status: 'flagged' });
  assert.equal(capture.populate.some((item) => item.path === 'reportedBy'), true);
  assert.deepEqual(capture.sort, { reportedAt: -1, createdAt: -1 });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.summary, {
    total: 3,
    pending: 0,
    flagged: 2,
    approved: 0,
    rejected: 1
  });
});

test('escapes search text and clamps an out-of-range page', async () => {
  let capturedQuery;
  const capture = { populate: [] };
  Review.countDocuments = async (query) => {
    capturedQuery = query;
    return 1;
  };
  Review.aggregate = async () => [];
  Review.find = () => createFindChain([], capture);

  const result = createResponse();
  await getReportedReviews({
    query: { search: 'Spam (quảng cáo)', page: 9, limit: 10 }
  }, result.response);

  assert.equal(capturedQuery.isReported, true);
  assert.equal(capturedQuery.$or.length, 3);
  assert.equal(capturedQuery.$or[0].comment.test('Spam (quảng cáo)'), true);
  assert.equal(capturedQuery.$or[0].comment.test('Spam quảng cáo'), false);
  assert.equal(capture.skip, 0);
  assert.equal(result.body.currentPage, 1);
  assert.equal(result.body.totalPages, 1);
});

test('rejects moderating a review that is already hidden', async () => {
  let saveCalled = false;
  Review.findById = async () => ({
    isDeleted: true,
    status: 'flagged',
    moderationReason: 'Ngôn từ xúc phạm',
    async save() {
      saveCalled = true;
    }
  });

  const result = createResponse();
  await moderateReview({
    params: { id: 'review-1' },
    body: { status: 'approved', moderationReason: '' },
    user: { _id: 'staff-1' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.match(result.body.message, /đã bị ẩn/);
  assert.equal(saveCalled, false);
});
