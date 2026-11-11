import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import TourSubmission from '../src/models/TourSubmission.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import {
  createTourSubmission,
  updateTourSubmission
} from '../src/controllers/tourSubmissionController.js';

const originalSubmissionFindOne = TourSubmission.findOne;
const originalSubmissionCreate = TourSubmission.create;
const originalTourFindById = Tour.findById;
const originalUserFind = User.find;
const originalNotificationCreate = Notification.create;

afterEach(() => {
  TourSubmission.findOne = originalSubmissionFindOne;
  TourSubmission.create = originalSubmissionCreate;
  Tour.findById = originalTourFindById;
  User.find = originalUserFind;
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

const makeTour = ({ status = 'draft', availableSeats = 0 } = {}) => {
  const calls = { saved: 0 };
  const tour = {
    _id: 'tour-1',
    title: 'Hà Nội - Hạ Long 3N2Đ',
    status,
    availableSeats,
    providerId: 'provider-1',
    save: async () => {
      calls.saved += 1;
    }
  };
  return { tour, calls };
};

const runCreate = async (tour) => {
  const calls = { created: 0, tourSaved: 0 };

  Tour.findById = async () => tour;
  TourSubmission.findOne = async () => null;
  TourSubmission.create = async (payload) => {
    calls.created += 1;
    return {
      ...payload,
      _id: 'submission-1',
      populate: async () => {}
    };
  };
  tour.save = async () => {
    calls.tourSaved += 1;
  };
  // Không có staff đang hoạt động: bỏ qua bước gửi thông báo.
  User.find = () => ({ select: async () => [] });

  const result = createResponse();
  await createTourSubmission(
    {
      body: { tourId: 'tour-1', providerNote: '' },
      user: { _id: 'provider-1', role: 'tourProvider' }
    },
    result.response
  );

  return { result, calls };
};

const makeSubmission = () => {
  const calls = { saved: 0 };
  const submission = {
    _id: 'submission-1',
    tourId: 'tour-1',
    providerId: 'provider-1',
    status: 'pending',
    reviewNote: '',
    reviewedAt: null,
    reviewedBy: null,
    save: async () => {
      calls.saved += 1;
    },
    populate: async () => {}
  };
  return { submission, calls };
};

const runApprove = async ({ submission, tour }) => {
  TourSubmission.findOne = async () => submission;
  Tour.findById = async () => tour;

  const notifications = [];
  Notification.create = async (payload) => {
    notifications.push(payload);
    return payload;
  };

  const result = createResponse();
  await updateTourSubmission(
    {
      params: { id: 'submission-1' },
      user: { _id: 'staff-1', role: 'staff' },
      body: { status: 'approved' }
    },
    result.response
  );

  return { result, notifications };
};

test('chặn gửi duyệt khi tour chưa có chỗ trống', async () => {
  const { tour, calls: tourCalls } = makeTour({ availableSeats: 0 });

  const { result, calls } = await runCreate(tour);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.message, 'Tour chưa có chỗ trống. Vui lòng cập nhật số chỗ trước khi gửi duyệt.');
  assert.equal(calls.created, 0);
  assert.equal(calls.tourSaved, 0);
  assert.equal(tour.status, 'draft');
  assert.equal(tourCalls.saved, 0);
});

test('tour còn chỗ vẫn gửi duyệt được như cũ', async () => {
  const { tour } = makeTour({ availableSeats: 5 });

  const { result, calls } = await runCreate(tour);

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.equal(calls.created, 1);
  assert.equal(calls.tourSaved, 1);
  assert.equal(tour.status, 'pending');
});

test('chặn duyệt khi tour chưa có chỗ trống và không đổi dữ liệu', async () => {
  const { submission, calls: submissionCalls } = makeSubmission();
  const { tour, calls: tourCalls } = makeTour({ status: 'pending', availableSeats: 0 });

  const { result, notifications } = await runApprove({ submission, tour });

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.message, 'Tour chưa có chỗ trống. Vui lòng yêu cầu nhà cung cấp cập nhật số chỗ trước khi duyệt.');
  assert.equal(submission.status, 'pending');
  assert.equal(submission.reviewedAt, null);
  assert.equal(submission.reviewedBy, null);
  assert.equal(tour.status, 'pending');
  assert.equal(submissionCalls.saved, 0);
  assert.equal(tourCalls.saved, 0);
  assert.equal(notifications.length, 0);
});

test('tour còn chỗ vẫn duyệt và mở bán được như cũ', async () => {
  const { submission } = makeSubmission();
  const { tour } = makeTour({ status: 'pending', availableSeats: 10 });

  const { result, notifications } = await runApprove({ submission, tour });

  assert.equal(result.statusCode, 200);
  assert.equal(submission.status, 'approved');
  assert.ok(submission.reviewedAt instanceof Date);
  assert.equal(tour.status, 'active');
  assert.equal(notifications.length, 1);
});
