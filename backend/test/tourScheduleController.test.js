import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import Booking from '../src/models/Booking.js';
import Departure from '../src/models/Departure.js';
import {
  createTourSchedule,
  deleteTourSchedule,
  updateTourSchedule
} from '../src/controllers/tourController.js';

const originalFindById = Tour.findById;
const originalDepartureCount = Departure.countDocuments;
const originalBookingCount = Booking.countDocuments;

afterEach(() => {
  Tour.findById = originalFindById;
  Departure.countDocuments = originalDepartureCount;
  Booking.countDocuments = originalBookingCount;
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

// Tour không có lịch khởi hành/booking liên quan (trường hợp xóa được).
const stubNoRelatedData = () => {
  Departure.countDocuments = async () => 0;
  Booking.countDocuments = async () => 0;
};

const makeTour = ({ ownerId = 'provider-1', status = 'draft', itinerary = [] } = {}) => {
  let saveCount = 0;
  return {
    _id: 'tour-1',
    status,
    providerId: { equals: (value) => String(value) === ownerId },
    itinerary,
    async save() {
      saveCount += 1;
    },
    get saveCount() {
      return saveCount;
    }
  };
};

const makeDay = (id, day, extra = {}) => ({
  _id: id,
  day,
  title: `Ngày ${day}`,
  description: 'Nội dung',
  meals: [],
  ...extra
});

test('rejects creation when the requested schedule day already exists', async () => {
  const tour = makeTour({ itinerary: [{ _id: 'schedule-1', day: 1, title: 'Ngày đầu' }] });
  Tour.findById = async () => tour;
  const result = createResponse();

  await createTourSchedule({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: { day: 1, title: 'Trùng ngày', description: 'Nội dung hợp lệ', meals: [] }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(tour.saveCount, 0);
});

test('allows reusing the day number of a soft-deleted schedule', async () => {
  const tour = makeTour({
    itinerary: [makeDay('schedule-1', 1, { isDeleted: true, deletedAt: new Date() })]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await createTourSchedule({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: { day: 1, title: 'Ngày 1 mới', description: 'Nội dung hợp lệ', meals: [] }
  }, result.response);

  assert.equal(result.statusCode, 201);
  assert.equal(tour.saveCount, 1);
  assert.equal(tour.itinerary.length, 2);
  assert.equal(result.body.itinerary.length, 1);
  assert.equal(result.body.itinerary[0].title, 'Ngày 1 mới');
});

test('updates a schedule day, removes duplicate meals and keeps itinerary sorted', async () => {
  const scheduleToUpdate = {
    _id: 'schedule-1', day: 1, title: 'Cũ', description: 'Nội dung cũ', meals: []
  };
  const tour = makeTour({
    itinerary: [
      scheduleToUpdate,
      { _id: 'schedule-2', day: 2, title: 'Ngày 2', description: 'Nội dung', meals: [] }
    ]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await updateTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' },
    body: {
      day: 3,
      title: 'Ngày cuối',
      description: 'Khám phá thành phố',
      meals: ['Sáng', 'Sáng', 'Tối']
    }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(tour.saveCount, 1);
  assert.deepEqual(tour.itinerary.map((item) => item.day), [2, 3]);
  assert.deepEqual(scheduleToUpdate.meals, ['Sáng', 'Tối']);
  assert.equal(result.body.data.title, 'Ngày cuối');
});

test('prevents changing a schedule to a day used by another item', async () => {
  const tour = makeTour({
    itinerary: [
      { _id: 'schedule-1', day: 1, title: 'Ngày 1', description: 'Nội dung', meals: [] },
      { _id: 'schedule-2', day: 2, title: 'Ngày 2', description: 'Nội dung', meals: [] }
    ]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await updateTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' },
    body: { day: 2, title: 'Ngày trùng', description: 'Nội dung hợp lệ', meals: [] }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(tour.saveCount, 0);
});

test('rejects schedule updates from a provider who does not own the tour', async () => {
  const tour = makeTour({
    ownerId: 'provider-owner',
    itinerary: [{ _id: 'schedule-1', day: 1, title: 'Ngày 1', description: 'Nội dung', meals: [] }]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await updateTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-other' },
    body: { day: 1, title: 'Thay đổi', description: 'Nội dung hợp lệ', meals: [] }
  }, result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(tour.saveCount, 0);
});

// START UC39 - Delete Tour Schedule
test('soft-deletes the selected schedule day and hides it from the active list', async () => {
  stubNoRelatedData();
  const tour = makeTour({
    itinerary: [makeDay('schedule-1', 1), makeDay('schedule-2', 2)]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(tour.saveCount, 1);
  // Bản ghi vẫn còn trong database, chỉ đánh dấu đã xóa.
  assert.equal(tour.itinerary.length, 2);
  const removed = tour.itinerary.find((item) => item._id === 'schedule-1');
  assert.equal(removed.isDeleted, true);
  assert.ok(removed.deletedAt instanceof Date);
  assert.deepEqual(result.body.itinerary.map((item) => item._id), ['schedule-2']);
  assert.equal(result.body.scheduleId, 'schedule-1');
});

test('keeps other schedule days of the same tour untouched', async () => {
  stubNoRelatedData();
  const untouched = makeDay('schedule-2', 2);
  const tour = makeTour({ itinerary: [makeDay('schedule-1', 1), untouched] });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(untouched.isDeleted, undefined);
  assert.equal(tour.itinerary[1], untouched);
});

test('refuses to delete a schedule that was already soft-deleted', async () => {
  stubNoRelatedData();
  const tour = makeTour({
    itinerary: [
      makeDay('schedule-1', 1, { isDeleted: true, deletedAt: new Date() }),
      makeDay('schedule-2', 2)
    ]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.match(result.body.message, /đã bị xóa/i);
  assert.equal(tour.saveCount, 0);
});

test('returns 404 for a schedule day that does not exist', async () => {
  stubNoRelatedData();
  const tour = makeTour({ itinerary: [makeDay('schedule-1', 1)] });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-404' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 404);
  assert.equal(tour.saveCount, 0);
});

test('blocks deletion when the tour still has scheduled departures', async () => {
  Departure.countDocuments = async () => 2;
  Booking.countDocuments = async () => 0;
  const tour = makeTour({ itinerary: [makeDay('schedule-1', 1), makeDay('schedule-2', 2)] });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.match(result.body.message, /lịch khởi hành|đặt tour/i);
  assert.equal(result.body.scheduledDepartures, 2);
  assert.equal(tour.saveCount, 0);
  assert.equal(tour.itinerary[0].isDeleted, undefined);
});

test('blocks deletion when the tour still has active bookings', async () => {
  Departure.countDocuments = async () => 0;
  Booking.countDocuments = async () => 1;
  const tour = makeTour({ itinerary: [makeDay('schedule-1', 1), makeDay('schedule-2', 2)] });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-2' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.activeBookings, 1);
  assert.equal(tour.saveCount, 0);
});

test('blocks deleting the last active schedule day of a tour', async () => {
  stubNoRelatedData();
  const tour = makeTour({
    itinerary: [
      makeDay('schedule-1', 1, { isDeleted: true, deletedAt: new Date() }),
      makeDay('schedule-2', 2)
    ]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-2' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.match(result.body.message, /cuối cùng/i);
  assert.equal(tour.saveCount, 0);
});

test('blocks deletion while the tour is active', async () => {
  stubNoRelatedData();
  const tour = makeTour({
    status: 'active',
    itinerary: [makeDay('schedule-1', 1), makeDay('schedule-2', 2)]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.match(result.body.message, /tạm ngưng tour/i);
  assert.equal(tour.saveCount, 0);
  assert.equal(tour.itinerary[0].isDeleted, undefined);
});

test('rejects deletion from a provider who does not own the tour', async () => {
  stubNoRelatedData();
  const tour = makeTour({
    ownerId: 'provider-owner',
    itinerary: [makeDay('schedule-1', 1), makeDay('schedule-2', 2)]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-other' }
  }, result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(tour.saveCount, 0);
});
// END UC39 - Delete Tour Schedule
