import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Complaint from '../src/models/Complaint.js';
import { createComplaint, updateComplaint } from '../src/controllers/complaintController.js';

const originalBookingFindOne = Booking.findOne;
const originalComplaintFindOne = Complaint.findOne;
const originalComplaintCreate = Complaint.create;

afterEach(() => {
  Booking.findOne = originalBookingFindOne;
  Complaint.findOne = originalComplaintFindOne;
  Complaint.create = originalComplaintCreate;
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

const mockBooking = (booking) => {
  Booking.findOne = () => ({
    populate: async () => booking
  });
};

const mockActiveComplaint = (complaint) => {
  Complaint.findOne = async () => complaint;
};

const baseRequest = (overrides = {}) => ({
  user: { _id: 'customer-1' },
  body: {
    bookingId: 'booking-1',
    category: 'quality_mismatch',
    description: 'Hướng dẫn viên đến muộn và bỏ qua nhiều điểm trong lịch trình.',
    ...overrides.body
  }
});

const mockCreatedComplaint = (payload) => {
  const created = { ...payload, _id: 'complaint-1', createdAt: new Date('2026-11-08T10:00:00Z') };
  created.populate = async function populate() { return this; };
  return created;
};

test('creates a complaint owned by the authenticated customer with evidence images', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: 'customer-1',
    status: 'confirmed',
    tourId: { _id: 'tour-1', title: 'Tour Đà Nẵng', providerId: 'provider-1' }
  });
  mockActiveComplaint(null);

  let createdPayload;
  Complaint.create = async (payload) => {
    createdPayload = payload;
    return mockCreatedComplaint(payload);
  };

  const result = createResponse();
  await createComplaint(
    baseRequest({ body: { evidenceImages: ['https://cdn.example.com/evidence-1.jpg'] } }),
    result.response
  );

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.equal(createdPayload.customerId, 'customer-1');
  assert.equal(createdPayload.bookingId, 'booking-1');
  assert.equal(createdPayload.tourId, 'tour-1');
  assert.equal(createdPayload.providerId, 'provider-1');
  assert.equal(createdPayload.category, 'quality_mismatch');
  assert.deepEqual(createdPayload.evidenceImages, ['https://cdn.example.com/evidence-1.jpg']);
});

test('defaults evidenceImages to an empty array when none are sent', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: 'customer-1',
    status: 'confirmed',
    tourId: { _id: 'tour-1', providerId: 'provider-1' }
  });
  mockActiveComplaint(null);

  let createdPayload;
  Complaint.create = async (payload) => {
    createdPayload = payload;
    return mockCreatedComplaint(payload);
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 201);
  assert.deepEqual(createdPayload.evidenceImages, []);
});

test('returns 404 when the booking does not belong to the customer', async () => {
  mockBooking(null);
  Complaint.create = async () => {
    throw new Error('Complaint must not be created');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.success, false);
});

test('rejects complaints for unconfirmed bookings', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: 'customer-1',
    status: 'pending',
    tourId: { _id: 'tour-1', providerId: 'provider-1' }
  });
  Complaint.create = async () => {
    throw new Error('Complaint must not be created');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
});

test('rejects a second open complaint for the same booking', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: 'customer-1',
    status: 'confirmed',
    tourId: { _id: 'tour-1', providerId: 'provider-1' }
  });
  mockActiveComplaint({ _id: 'complaint-existing' });
  Complaint.create = async () => {
    throw new Error('Complaint must not be created');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
});

test('maps a duplicate-key race to a safe 409 error', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: 'customer-1',
    status: 'confirmed',
    tourId: { _id: 'tour-1', providerId: 'provider-1' }
  });
  mockActiveComplaint(null);
  Complaint.create = async () => {
    const error = new Error('E11000 duplicate key error');
    error.code = 11000;
    throw error;
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message.includes('E11000'), false);
});

test('returns a safe error when the database operation fails', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: 'customer-1',
    status: 'confirmed',
    tourId: { _id: 'tour-1', providerId: 'provider-1' }
  });
  mockActiveComplaint(null);
  Complaint.create = async () => {
    throw new Error('MongoServerError: connection lost');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 500);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Không thể gửi khiếu nại');
  assert.equal(result.body.message.includes('MongoServerError'), false);
});

// START STT 68 Update Booking Complaint Tests
test('STT 68: updateComplaint allows customer to update an open complaint', async () => {
  let saved = false;
  let populated = false;
  const complaintDoc = {
    _id: 'complaint-1',
    customerId: 'customer-1',
    status: 'open',
    category: 'other',
    description: 'Nội dung ban đầu của khiếu nại hơn 20 ký tự',
    evidenceImages: [],
    save: async () => { saved = true; },
    populate: async () => { populated = true; }
  };

  Complaint.findOne = async () => complaintDoc;

  const res = createResponse();
  await updateComplaint({
    params: { id: 'complaint-1' },
    user: { _id: 'customer-1' },
    body: {
      category: 'quality_mismatch',
      description: 'Nội dung mới đã được cập nhật chi tiết hơn rất nhiều',
      evidenceImages: ['https://example.com/evidence1.jpg']
    }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(complaintDoc.category, 'quality_mismatch');
  assert.equal(complaintDoc.description, 'Nội dung mới đã được cập nhật chi tiết hơn rất nhiều');
  assert.equal(saved, true);
  assert.equal(populated, true);
});

test('STT 68: updateComplaint rejects updating when status is not open (409)', async () => {
  const complaintDoc = {
    _id: 'complaint-1',
    customerId: 'customer-1',
    status: 'in_review',
    category: 'other',
    description: 'Nội dung ban đầu khiếu nại'
  };

  Complaint.findOne = async () => complaintDoc;

  const res = createResponse();
  await updateComplaint({
    params: { id: 'complaint-1' },
    user: { _id: 'customer-1' },
    body: {
      description: 'Cố gắng sửa khiếu nại đang được xử lý'
    }
  }, res.response);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Chỉ có thể chỉnh sửa khiếu nại khi đang ở trạng thái mới gửi/);
});

test('STT 68: updateComplaint returns 404 when complaint not found', async () => {
  Complaint.findOne = async () => null;

  const res = createResponse();
  await updateComplaint({
    params: { id: 'non-existent' },
    user: { _id: 'customer-1' },
    body: {}
  }, res.response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});
// END STT 68 Update Booking Complaint Tests
