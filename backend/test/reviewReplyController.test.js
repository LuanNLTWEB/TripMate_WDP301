import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Review from '../src/models/Review.js';
import Tour from '../src/models/Tour.js';
import Notification from '../src/models/Notification.js';
import {
  getProviderReviewsByTour,
  replyReview,
  updateReviewReply,
  deleteReviewReply
} from '../src/controllers/reviewController.js';

const originalReviewFindById = Review.findById;
const originalReviewFind = Review.find;
const originalTourFindById = Tour.findById;
const originalNotificationCreate = Notification.create;

afterEach(() => {
  Review.findById = originalReviewFindById;
  Review.find = originalReviewFind;
  Tour.findById = originalTourFindById;
  Notification.create = originalNotificationCreate;
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

test('provider replies to an approved review on their own tour and notifies customer', async () => {
  let saved = false;
  let capturedNotification = null;

  const mockReview = {
    _id: 'rev-1',
    tourId: 'tour-1',
    userId: 'customer-1',
    status: 'approved',
    isDeleted: false,
    reply: { comment: '', isDeleted: false },
    save: async () => { saved = true; }
  };

  Review.findById = async () => mockReview;
  Tour.findById = async () => ({
    _id: 'tour-1',
    title: 'Tour Phú Quốc 3N2Đ',
    providerId: 'provider-1',
    isDeleted: false
  });
  Notification.create = async (doc) => {
    capturedNotification = doc;
    return doc;
  };

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'provider-1', role: 'tourProvider' },
    body: { comment: '  Cảm ơn quý khách đã đồng hành cùng chúng tôi!  ' }
  };
  const res = createResponse();

  await replyReview(req, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(saved, true);
  assert.equal(mockReview.reply.comment, 'Cảm ơn quý khách đã đồng hành cùng chúng tôi!');
  assert.equal(mockReview.reply.userId, 'provider-1');
  assert.equal(mockReview.reply.isDeleted, false);
  assert.ok(mockReview.reply.repliedAt instanceof Date);
  assert.ok(capturedNotification);
  assert.equal(capturedNotification.recipient, 'customer-1');
  assert.equal(capturedNotification.notificationType, 'review_reply');
});

test('provider cannot reply to a review belonging to another provider tour', async () => {
  Review.findById = async () => ({
    _id: 'rev-1',
    tourId: 'tour-2',
    userId: 'customer-1',
    status: 'approved',
    isDeleted: false
  });
  Tour.findById = async () => ({
    _id: 'tour-2',
    title: 'Tour Đà Lạt',
    providerId: 'provider-other',
    isDeleted: false
  });

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'provider-1', role: 'tourProvider' },
    body: { comment: 'Cảm ơn bạn đã tham gia tour.' }
  };
  const res = createResponse();

  await replyReview(req, res.response);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test('provider cannot create duplicate reply when active reply already exists', async () => {
  Review.findById = async () => ({
    _id: 'rev-1',
    tourId: 'tour-1',
    userId: 'customer-1',
    status: 'approved',
    isDeleted: false,
    reply: {
      comment: 'Phản hồi đã có',
      userId: 'provider-1',
      isDeleted: false
    }
  });
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1',
    isDeleted: false
  });

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'provider-1', role: 'tourProvider' },
    body: { comment: 'Phản hồi lần 2' }
  };
  const res = createResponse();

  await replyReview(req, res.response);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

test('provider updates active reply on their tour review', async () => {
  let saved = false;
  const mockReview = {
    _id: 'rev-1',
    tourId: 'tour-1',
    userId: 'customer-1',
    status: 'approved',
    isDeleted: false,
    reply: {
      comment: 'Nội dung cũ',
      userId: 'provider-1',
      repliedAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: null,
      isDeleted: false
    },
    save: async () => { saved = true; }
  };

  Review.findById = async () => mockReview;
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1',
    isDeleted: false
  });

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'provider-1', role: 'tourProvider' },
    body: { comment: 'Nội dung phản hồi đã chỉnh sửa' }
  };
  const res = createResponse();

  await updateReviewReply(req, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(saved, true);
  assert.equal(mockReview.reply.comment, 'Nội dung phản hồi đã chỉnh sửa');
  assert.ok(mockReview.reply.updatedAt instanceof Date);
});

test('provider soft-deletes reply and preserves soft-delete metadata', async () => {
  let saved = false;
  const mockReview = {
    _id: 'rev-1',
    tourId: 'tour-1',
    userId: 'customer-1',
    status: 'approved',
    isDeleted: false,
    reply: {
      comment: 'Nội dung phản hồi',
      userId: 'provider-1',
      repliedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    },
    save: async () => { saved = true; }
  };

  Review.findById = async () => mockReview;
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1',
    isDeleted: false
  });

  const req = {
    params: { id: 'rev-1' },
    user: { _id: 'provider-1', role: 'tourProvider' }
  };
  const res = createResponse();

  await deleteReviewReply(req, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(saved, true);
  assert.equal(mockReview.reply.isDeleted, true);
  assert.ok(mockReview.reply.deletedAt instanceof Date);
  assert.equal(mockReview.reply.deletedBy, 'provider-1');
  assert.equal(mockReview.reply.comment, 'Nội dung phản hồi');
});

test('provider can list reviews of their own tour via getProviderReviewsByTour', async () => {
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1',
    isDeleted: false
  });
  Review.find = () => ({
    populate() { return this; },
    sort: async () => [
      { _id: 'rev-1', rating: 5, comment: 'Tuyệt vời' },
      { _id: 'rev-2', rating: 4, comment: 'Rất tốt' }
    ]
  });

  const req = {
    params: { tourId: 'tour-1' },
    user: { _id: 'provider-1', role: 'tourProvider' }
  };
  const res = createResponse();

  await getProviderReviewsByTour(req, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.totalReviews, 2);
  assert.equal(res.body.averageRating, 4.5);
});
