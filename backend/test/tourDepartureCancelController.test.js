import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Departure from '../src/models/Departure.js';
import Tour from '../src/models/Tour.js';
import Booking from '../src/models/Booking.js';
import Notification from '../src/models/Notification.js';
import { cancelDeparture } from '../src/controllers/departureController.js';

const originalDepartureFindById = Departure.findById;
const originalTourFindById = Tour.findById;
const originalBookingFind = Booking.find;
const originalNotificationCreate = Notification.create;

afterEach(() => {
  Departure.findById = originalDepartureFindById;
  Tour.findById = originalTourFindById;
  Booking.find = originalBookingFind;
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

const makeDeparture = ({
  id = 'dep-1',
  tourId = 'tour-1',
  providerId = 'provider-1',
  departureDate = new Date(Date.now() + 100 * 60 * 60 * 1000), // 100h in future
  status = 'scheduled',
  note = ''
} = {}) => {
  let saveCount = 0;
  return {
    _id: id,
    tourId,
    providerId: { equals: (val) => String(val) === providerId },
    departureDate,
    status,
    note,
    cancelReason: '',
    cancelledAt: null,
    async save() {
      saveCount += 1;
    },
    get saveCount() {
      return saveCount;
    }
  };
};

test('cancelDeparture returns 404 when departure is not found', async () => {
  Departure.findById = async () => null;
  const result = createResponse();

  await cancelDeparture({
    params: { id: 'dep-not-found' },
    user: { _id: 'provider-1' },
    body: {}
  }, result.response);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.success, false);
  assert.match(result.body.message, /Không tìm thấy/);
});

test('cancelDeparture returns 403 when user is not the owner provider', async () => {
  const departure = makeDeparture({ providerId: 'provider-1' });
  Departure.findById = async () => departure;
  const result = createResponse();

  await cancelDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'other-provider' },
    body: {}
  }, result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
  assert.equal(departure.saveCount, 0);
});

test('cancelDeparture returns 409 when departure is already cancelled', async () => {
  const departure = makeDeparture({ status: 'cancelled' });
  Departure.findById = async () => departure;
  const result = createResponse();

  await cancelDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'provider-1' },
    body: {}
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.match(result.body.message, /đã bị hủy trước đó/);
  assert.equal(departure.saveCount, 0);
});

test('cancelDeparture returns 400 when departure is in the past', async () => {
  const departure = makeDeparture({
    departureDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
  });
  Departure.findById = async () => departure;
  const result = createResponse();

  await cancelDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'provider-1' },
    body: {}
  }, result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.match(result.body.message, /quá khứ/);
  assert.equal(departure.saveCount, 0);
});

test('cancelDeparture returns 409 when departure is within 72 hours (BR-54 violation)', async () => {
  const departure = makeDeparture({
    departureDate: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h in future (< 72h)
  });
  Departure.findById = async () => departure;
  const result = createResponse();

  await cancelDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'provider-1' },
    body: { reason: 'Thời tiết xấu' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.match(result.body.message, /72 giờ/);
  assert.ok(result.body.hoursRemaining >= 47 && result.body.hoursRemaining <= 48);
  assert.equal(departure.saveCount, 0);
});

test('cancelDeparture succeeds when departure is >= 72 hours in future and cascades to bookings & notifications', async () => {
  const departure = makeDeparture({
    departureDate: new Date(Date.now() + 96 * 60 * 60 * 1000) // 96h in future
  });
  Departure.findById = async () => departure;

  Tour.findById = () => ({
    select: async () => ({ _id: 'tour-1', title: 'Tour Phú Quốc 3N2Đ' })
  });

  const savedBookings = [];
  const mockBooking = {
    _id: 'booking-1',
    customerId: 'cust-1',
    status: 'confirmed',
    cancelReason: '',
    cancelledAt: null,
    async save() {
      savedBookings.push(this);
    }
  };

  Booking.find = async () => [mockBooking];

  const createdNotifications = [];
  Notification.create = async (payload) => {
    createdNotifications.push(payload);
    return payload;
  };

  const result = createResponse();

  await cancelDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'provider-1' },
    body: { reason: 'Bảo trì cáp treo đột xuất' }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(departure.status, 'cancelled');
  assert.equal(departure.cancelReason, 'Bảo trì cáp treo đột xuất');
  assert.ok(departure.cancelledAt instanceof Date);
  assert.equal(departure.saveCount, 1);

  // Verify booking cascade
  assert.equal(savedBookings.length, 1);
  assert.equal(mockBooking.status, 'cancelled');
  assert.match(mockBooking.cancelReason, /Bảo trì cáp treo đột xuất/);
  assert.match(mockBooking.cancelReason, /hoàn tiền 100%/i);

  // Verify notification created for customer
  assert.equal(createdNotifications.length, 1);
  assert.equal(createdNotifications[0].recipient, 'cust-1');
  assert.equal(createdNotifications[0].notificationType, 'departure_cancellation');
  assert.match(createdNotifications[0].message, /hoàn lại 100% chi phí/);
  assert.match(createdNotifications[0].message, /Bảo trì cáp treo đột xuất/);
});
