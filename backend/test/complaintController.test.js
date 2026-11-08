import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Complaint from '../src/models/Complaint.js';
import { createComplaint } from '../src/controllers/complaintController.js';

const originalBookingFindById = Booking.findById;
const originalComplaintFindOne = Complaint.findOne;
const originalComplaintCreate = Complaint.create;
const originalComplaintFindById = Complaint.findById;

afterEach(() => {
  Booking.findById = originalBookingFindById;
  Complaint.findOne = originalComplaintFindOne;
  Complaint.create = originalComplaintCreate;
  Complaint.findById = originalComplaintFindById;
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
  Booking.findById = () => ({
    populate: async () => booking
  });
};

const mockActiveComplaint = (complaint) => {
  Complaint.findOne = () => ({
    select: async () => complaint
  });
};

const baseRequest = (overrides = {}) => ({
  user: { _id: 'customer-1' },
  body: {
    bookingId: 'booking-1',
    complaintType: 'tour_service',
    description: 'Hướng dẫn viên đến muộn và bỏ qua nhiều điểm trong lịch trình.',
    ...overrides.body
  }
});

test('creates a complaint owned by the authenticated customer', async () => {
  const booking = {
    _id: 'booking-1',
    customerId: { toString: () => 'customer-1' },
    tourId: { _id: 'tour-1', title: 'Tour Đà Nẵng' }
  };
  mockBooking(booking);
  mockActiveComplaint(null);

  let createdPayload;
  const createdComplaint = {
    _id: 'complaint-1',
    booking,
    customer: { _id: 'customer-1', username: 'khachhang' },
    complaintType: 'tour_service',
    description: 'Hướng dẫn viên đến muộn và bỏ qua nhiều điểm trong lịch trình.',
    evidenceImages: [],
    status: 'pending',
    createdAt: new Date('2026-11-08T10:00:00Z')
  };
  Complaint.create = async (payload) => {
    createdPayload = payload;
    return { ...payload, _id: 'complaint-1' };
  };
  Complaint.findById = () => ({
    populate() {
      return this;
    },
    then(resolve) {
      return Promise.resolve(resolve(createdComplaint));
    }
  });

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data, createdComplaint);
  assert.equal(createdPayload.customer, 'customer-1');
  assert.equal(createdPayload.booking, 'booking-1');
  assert.equal(createdPayload.status, 'pending');
  assert.deepEqual(createdPayload.evidenceImages, []);
});

test('stores uploaded evidence image URLs', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: { toString: () => 'customer-1' },
    tourId: { _id: 'tour-1' }
  });
  mockActiveComplaint(null);

  let createdPayload;
  Complaint.create = async (payload) => {
    createdPayload = payload;
    return { ...payload, _id: 'complaint-1' };
  };
  Complaint.findById = () => ({
    populate() {
      return this;
    },
    then(resolve) {
      return Promise.resolve(resolve({ _id: 'complaint-1' }));
    }
  });

  const result = createResponse();
  await createComplaint(baseRequest({
    body: {
      evidenceImages: [
        'https://cdn.example.com/evidence-1.jpg',
        'https://cdn.example.com/evidence-2.png'
      ]
    }
  }), result.response);

  assert.equal(result.statusCode, 201);
  assert.deepEqual(createdPayload.evidenceImages, [
    'https://cdn.example.com/evidence-1.jpg',
    'https://cdn.example.com/evidence-2.png'
  ]);
});

test('rejects a booking owned by another customer', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: { toString: () => 'someone-else' },
    tourId: { _id: 'tour-1' }
  });
  Complaint.create = async () => {
    throw new Error('Complaint must not be created');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
});

test('returns 404 when the booking does not exist', async () => {
  mockBooking(null);
  Complaint.create = async () => {
    throw new Error('Complaint must not be created');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.success, false);
});

test('rejects a second pending complaint for the same booking', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: { toString: () => 'customer-1' },
    tourId: { _id: 'tour-1' }
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

test('returns a safe error when the database operation fails', async () => {
  mockBooking({
    _id: 'booking-1',
    customerId: { toString: () => 'customer-1' },
    tourId: { _id: 'tour-1' }
  });
  mockActiveComplaint(null);
  Complaint.create = async () => {
    throw new Error('MongoServerError: connection lost');
  };

  const result = createResponse();
  await createComplaint(baseRequest(), result.response);

  assert.equal(result.statusCode, 500);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Không thể gửi khiếu nại. Vui lòng thử lại sau.');
  assert.equal(result.body.message.includes('MongoServerError'), false);
});
