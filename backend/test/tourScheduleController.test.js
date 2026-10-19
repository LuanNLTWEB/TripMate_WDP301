import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import {
  createTourSchedule,
  deleteTourSchedule,
  updateTourSchedule
} from '../src/controllers/tourController.js';

const originalFindById = Tour.findById;

afterEach(() => {
  Tour.findById = originalFindById;
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

const makeTour = ({ ownerId = 'provider-1', itinerary = [] } = {}) => {
  let saveCount = 0;
  return {
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

test('deletes only the selected schedule day for the owning provider', async () => {
  const tour = makeTour({
    itinerary: [
      { _id: 'schedule-1', day: 1, title: 'Ngày 1', description: 'Nội dung', meals: [] },
      { _id: 'schedule-2', day: 2, title: 'Ngày 2', description: 'Nội dung', meals: [] }
    ]
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await deleteTourSchedule({
    params: { id: 'tour-1', scheduleId: 'schedule-1' },
    user: { _id: 'provider-1' }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(tour.saveCount, 1);
  assert.deepEqual(tour.itinerary.map((item) => item._id), ['schedule-2']);
  assert.equal(result.body.scheduleId, 'schedule-1');
});
