import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Review from '../src/models/Review.js';
import { voteHelpfulReview } from '../src/controllers/reviewController.js';

const originalReviewFindById = Review.findById;

afterEach(() => {
  Review.findById = originalReviewFindById;
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

test('customer votes helpful on another customer review (toggle on)', async () => {
  let saved = false;
  const mockReview = {
    _id: 'rev-1',
    userId: 'customer-2',
    status: 'approved',
    isDeleted: false,
    helpfulCount: 0,
    helpfulVotes: [],
    save: async () => { saved = true; }
  };

  Review.findById = async () => mockReview;

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'customer-1', role: 'customer' }
  };
  const res = createResponse();

  await voteHelpfulReview(req, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.isHelpful, true);
  assert.equal(res.body.data.helpfulCount, 1);
  assert.equal(mockReview.helpfulVotes.includes('customer-1'), true);
  assert.equal(saved, true);
});

test('customer unvotes helpful on subsequent click (toggle off)', async () => {
  let saved = false;
  const mockReview = {
    _id: 'rev-1',
    userId: 'customer-2',
    status: 'approved',
    isDeleted: false,
    helpfulCount: 1,
    helpfulVotes: ['customer-1'],
    save: async () => { saved = true; }
  };

  Review.findById = async () => mockReview;

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'customer-1', role: 'customer' }
  };
  const res = createResponse();

  await voteHelpfulReview(req, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.isHelpful, false);
  assert.equal(res.body.data.helpfulCount, 0);
  assert.equal(mockReview.helpfulVotes.includes('customer-1'), false);
  assert.equal(saved, true);
});

test('customer cannot self-vote own review', async () => {
  const mockReview = {
    _id: 'rev-1',
    userId: 'customer-1',
    status: 'approved',
    isDeleted: false,
    helpfulCount: 0,
    helpfulVotes: []
  };

  Review.findById = async () => mockReview;

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'customer-1', role: 'customer' }
  };
  const res = createResponse();

  await voteHelpfulReview(req, res.response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /không thể tự bình chọn/i);
});

test('cannot vote on deleted or non-existent review', async () => {
  Review.findById = async () => null;

  const req = {
    params: { id: 'rev-missing' },
    user: { _id: 'customer-1', role: 'customer' }
  };
  const res = createResponse();

  await voteHelpfulReview(req, res.response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});
