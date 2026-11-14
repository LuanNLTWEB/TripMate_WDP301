import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import TourSubmission from '../src/models/TourSubmission.js';
import Notification from '../src/models/Notification.js';
import { restoreTour, updateTourStatus } from '../src/controllers/tourController.js';

const originalTourFindById = Tour.findById;
const originalSubmissionFindOne = TourSubmission.findOne;
const originalNotificationCreate = Notification.create;

afterEach(() => {
  Tour.findById = originalTourFindById;
  TourSubmission.findOne = originalSubmissionFindOne;
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

const makeTour = ({
  status = 'active',
  availableSeats = 10,
  revisionNote = '',
  revisionRequestedAt = null,
  rejectionReason = '',
  rejectedAt = null
} = {}) => {
  const calls = { saved: 0 };
  const tour = {
    _id: 'tour-1',
    title: 'Hà Nội - Hạ Long 3N2Đ',
    status,
    availableSeats,
    providerId: 'provider-1',
    revisionNote,
    revisionRequestedAt,
    revisionRequestedBy: revisionRequestedAt ? 'staff-1' : null,
    rejectionReason,
    rejectedAt,
    rejectedBy: rejectedAt ? 'staff-1' : null,
    suspensionReason: 'Cần kiểm tra thông tin tour',
    suspendedAt: new Date(),
    suspendedBy: 'staff-1',
    save: async () => {
      calls.saved += 1;
    },
    populate: async () => {}
  };
  return { tour, calls };
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
    }
  };
  return { submission, calls };
};

const collectNotifications = () => {
  const notifications = [];
  Notification.create = async (payload) => {
    notifications.push(payload);
    return payload;
  };
  return notifications;
};

const runStatusUpdate = async (body) => {
  const result = createResponse();
  await updateTourStatus(
    {
      params: { id: 'tour-1' },
      user: { _id: 'staff-1', role: 'staff' },
      body
    },
    result.response
  );
  return result;
};

const runRestore = async () => {
  const result = createResponse();
  await restoreTour(
    { params: { id: 'tour-1' }, user: { _id: 'staff-1', role: 'staff' } },
    result.response
  );
  return result;
};

test('không cho chuyển tour đã bị từ chối sang active qua API trạng thái', async () => {
  const { tour, calls } = makeTour({ status: 'rejected', rejectionReason: 'Thông tin chưa chính xác', rejectedAt: new Date() });
  Tour.findById = async () => tour;
  const notifications = collectNotifications();

  const result = await runStatusUpdate({ status: 'active' });

  assert.equal(result.statusCode, 409);
  assert.equal(
    result.body.message,
    'Không thể chuyển tour sang trạng thái đang hoạt động tại đây. Hãy duyệt bài gửi duyệt hoặc khôi phục tour đang tạm ngưng.'
  );
  assert.equal(tour.status, 'rejected');
  assert.equal(calls.saved, 0);
  assert.equal(notifications.length, 0);
});

test('không cho chuyển tour cần chỉnh sửa sang active qua API trạng thái', async () => {
  const { tour, calls } = makeTour({ status: 'needs_revision', revisionNote: 'Bổ sung mô tả', revisionRequestedAt: new Date() });
  Tour.findById = async () => tour;
  collectNotifications();

  const result = await runStatusUpdate({ status: 'active' });

  assert.equal(result.statusCode, 409);
  assert.equal(tour.status, 'needs_revision');
  assert.equal(calls.saved, 0);
});

test('khôi phục tour tạm ngưng và gửi thông báo cho provider', async () => {
  const { tour, calls } = makeTour({ status: 'suspended' });
  Tour.findById = async () => tour;
  const notifications = collectNotifications();

  const result = await runRestore();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, 'Đã kích hoạt lại tour');
  assert.equal(tour.status, 'active');
  assert.equal(tour.suspensionReason, '');
  assert.equal(tour.suspendedAt, null);
  assert.equal(tour.suspendedBy, null);
  assert.equal(calls.saved, 1);

  assert.equal(notifications.length, 1);
  assert.equal(String(notifications[0].recipient), 'provider-1');
  assert.equal(notifications[0].notificationType, 'tour_moderation');
});

test('không khôi phục tour tạm ngưng khi chưa có chỗ trống', async () => {
  const { tour, calls } = makeTour({ status: 'suspended', availableSeats: 0 });
  Tour.findById = async () => tour;
  const notifications = collectNotifications();

  const result = await runRestore();

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.message, 'Tour chưa có chỗ trống. Vui lòng cập nhật số chỗ trước khi khôi phục tour.');
  assert.equal(tour.status, 'suspended');
  assert.equal(calls.saved, 0);
  assert.equal(notifications.length, 0);
});

test('không khôi phục tour tạm ngưng còn cờ chỉnh sửa cũ', async () => {
  const { tour, calls } = makeTour({
    status: 'suspended',
    revisionNote: 'Bổ sung mô tả',
    revisionRequestedAt: new Date()
  });
  Tour.findById = async () => tour;
  collectNotifications();

  const result = await runRestore();

  assert.equal(result.statusCode, 409);
  assert.equal(tour.status, 'suspended');
  assert.equal(calls.saved, 0);
});

test('chỉ từ chối được tour đang ở trạng thái chờ duyệt', async () => {
  const { tour, calls } = makeTour({ status: 'needs_revision', revisionNote: 'Bổ sung mô tả', revisionRequestedAt: new Date() });
  Tour.findById = async () => tour;
  let submissionLookups = 0;
  TourSubmission.findOne = async () => {
    submissionLookups += 1;
    return null;
  };
  collectNotifications();

  const result = await runStatusUpdate({ status: 'rejected', reason: 'Thông tin chưa chính xác' });

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.message, 'Chỉ có thể từ chối tour đang ở trạng thái chờ duyệt');
  assert.equal(tour.status, 'needs_revision');
  assert.equal(calls.saved, 0);
  assert.equal(submissionLookups, 0);
});

test('từ chối tour chờ duyệt đồng bộ bài gửi và báo provider', async () => {
  const { tour, calls: tourCalls } = makeTour({ status: 'pending' });
  const { submission, calls: submissionCalls } = makeSubmission();
  Tour.findById = async () => tour;
  TourSubmission.findOne = async () => submission;
  const notifications = collectNotifications();

  const result = await runStatusUpdate({ status: 'rejected', reason: 'Hình ảnh tour chưa đạt yêu cầu' });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, 'Đã từ chối duyệt tour');
  assert.equal(tour.status, 'rejected');
  assert.equal(tour.rejectionReason, 'Hình ảnh tour chưa đạt yêu cầu');
  assert.ok(tour.rejectedAt instanceof Date);
  assert.equal(String(tour.rejectedBy), 'staff-1');
  assert.equal(tourCalls.saved, 1);

  assert.equal(submission.status, 'rejected');
  assert.equal(submission.reviewNote, 'Hình ảnh tour chưa đạt yêu cầu');
  assert.ok(submission.reviewedAt instanceof Date);
  assert.equal(String(submission.reviewedBy), 'staff-1');
  assert.equal(submissionCalls.saved, 1);

  assert.equal(notifications.length, 1);
  assert.equal(String(notifications[0].recipient), 'provider-1');
  assert.equal(notifications[0].notificationType, 'tour_moderation');
});
