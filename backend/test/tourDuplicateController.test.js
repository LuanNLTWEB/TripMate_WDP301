import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import { duplicateTour } from '../src/controllers/tourController.js';

const originalFindById = Tour.findById;
const originalCreate = Tour.create;

afterEach(() => {
  Tour.findById = originalFindById;
  Tour.create = originalCreate;
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

const makeSourceTour = ({
  ownerId = 'provider-1',
  isDeleted = false,
  title = 'Hà Nội - Hạ Long 3N2Đ',
  status = 'active'
} = {}) => ({
  _id: 'tour-1',
  title,
  description: 'Mô tả tour gốc',
  location: 'Hạ Long',
  departureLocation: 'Hà Nội',
  destinationLocation: 'Hạ Long',
  price: 2500000,
  duration: '3 ngày 2 đêm',
  images: ['https://cdn.example.com/1.jpg', 'https://cdn.example.com/2.jpg'],
  availableSeats: 20,
  includedServices: ['Xe đưa đón', 'Khách sạn'],
  excludedServices: ['Vé tham quan'],
  cancellationPolicy: 'Hủy trước 7 ngày',
  notes: 'Mang giày thể thao',
  categoryId: 'category-1',
  status,
  isDeleted,
  providerId: ownerId
    ? { equals: (value) => String(value) === ownerId }
    : null,
  itinerary: [
    {
      _id: 'schedule-1',
      day: 1,
      title: 'Ngày 1',
      description: 'Khởi hành',
      meals: ['Sáng'],
      isDeleted: false,
      deletedAt: null
    },
    {
      _id: 'schedule-2',
      day: 2,
      title: 'Ngày 2',
      description: 'Khám phá vịnh',
      meals: ['Sáng', 'Trưa']
    },
    {
      _id: 'schedule-deleted',
      day: 3,
      title: 'Ngày đã xóa',
      description: 'Không còn hoạt động',
      meals: [],
      isDeleted: true,
      deletedAt: new Date('2026-01-01')
    }
  ]
});

const stubCreate = () => {
  const calls = { payload: null };
  Tour.create = async (payload) => {
    calls.payload = payload;
    return {
      ...payload,
      _id: 'tour-duplicated',
      async populate() {}
    };
  };
  return calls;
};

const runDuplicate = async (tour, user = { _id: 'provider-1' }) => {
  Tour.findById = async () => tour;
  const result = createResponse();
  await duplicateTour(
    { params: { id: 'tour-1' }, user, body: {} },
    result.response
  );
  return result;
};

test('returns 404 when the source tour does not exist', async () => {
  const calls = stubCreate();
  const result = await runDuplicate(null);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.message, 'Không tìm thấy tour');
  assert.equal(calls.payload, null);
});

test('returns 404 when the source tour was soft deleted', async () => {
  const calls = stubCreate();
  const result = await runDuplicate(makeSourceTour({ isDeleted: true }));

  assert.equal(result.statusCode, 404);
  assert.equal(calls.payload, null);
});

test('returns 403 when the tour belongs to another provider', async () => {
  const calls = stubCreate();
  const result = await runDuplicate(
    makeSourceTour({ ownerId: 'provider-owner' }),
    { _id: 'provider-other' }
  );

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.message, 'Bạn không có quyền nhân bản tour này');
  assert.equal(calls.payload, null);
});

test('returns 403 when the tour has no owner', async () => {
  const calls = stubCreate();
  const result = await runDuplicate(makeSourceTour({ ownerId: null }));

  assert.equal(result.statusCode, 403);
  assert.equal(calls.payload, null);
});

test('creates a draft tour owned by the acting provider and copies descriptive data', async () => {
  const calls = stubCreate();
  const source = makeSourceTour();
  const result = await runDuplicate(source);

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.equal(result.body.message, 'Nhân bản tour thành công');
  assert.equal(result.body.data._id, 'tour-duplicated');

  const payload = calls.payload;
  assert.equal(payload.title, 'Hà Nội - Hạ Long 3N2Đ (Bản sao)');
  assert.equal(payload.description, source.description);
  assert.equal(payload.location, source.location);
  assert.equal(payload.departureLocation, source.departureLocation);
  assert.equal(payload.destinationLocation, source.destinationLocation);
  assert.equal(payload.price, source.price);
  assert.equal(payload.duration, source.duration);
  assert.deepEqual(payload.images, source.images);
  // Số chỗ và điểm đánh giá là dữ liệu của tour gốc, bản sao bắt đầu lại từ 0.
  assert.equal(payload.availableSeats, 0);
  assert.deepEqual(payload.includedServices, source.includedServices);
  assert.deepEqual(payload.excludedServices, source.excludedServices);
  assert.equal(payload.cancellationPolicy, source.cancellationPolicy);
  assert.equal(payload.notes, source.notes);
  assert.equal(payload.categoryId, 'category-1');

  // UC-31: tour mới là bản nháp, không kế thừa trạng thái duyệt của tour gốc.
  assert.equal(payload.status, 'draft');
  assert.equal(payload.providerId, 'provider-1');
  assert.equal(payload.averageRating, 0);
});

test('copies only active schedule days without reusing their ids', async () => {
  const calls = stubCreate();
  await runDuplicate(makeSourceTour());

  const itinerary = calls.payload.itinerary;
  assert.equal(itinerary.length, 2);
  assert.deepEqual(itinerary.map((day) => day.day), [1, 2]);
  assert.deepEqual(itinerary[1].meals, ['Sáng', 'Trưa']);
  itinerary.forEach((day) => {
    assert.equal(day._id, undefined, 'schedule ids must be regenerated by Mongoose');
    assert.equal(day.isDeleted, undefined);
    assert.equal(day.deletedAt, undefined);
  });

  // Không chia sẻ tham chiếu mảng với tour gốc.
  const sourceMeals = makeSourceTour().itinerary[1].meals;
  assert.notEqual(itinerary[1].meals, sourceMeals);
});

test('strips ids of nested schedule records so they are regenerated', async () => {
  const calls = stubCreate();
  Tour.findById = async () => ({
    ...makeSourceTour(),
    itinerary: [
      {
        _id: 'schedule-1',
        day: 1,
        title: 'Ngày 1',
        description: 'Khởi hành',
        meals: ['Sáng'],
        activities: [
          { _id: 'activity-1', title: 'Đón khách', startTime: '08:00' }
        ]
      }
    ]
  });
  const result = createResponse();

  await duplicateTour(
    { params: { id: 'tour-1' }, user: { _id: 'provider-1' }, body: {} },
    result.response
  );

  assert.equal(result.statusCode, 201);
  const day = calls.payload.itinerary[0];
  assert.equal(day._id, undefined);
  assert.equal(day.activities[0]._id, undefined);
  assert.equal(day.activities[0].title, 'Đón khách');
});

test('does not modify the source tour status or schedule', async () => {
  const source = makeSourceTour({ status: 'suspended' });
  stubCreate();
  const result = await runDuplicate(source);

  assert.equal(result.statusCode, 201);
  assert.equal(source.status, 'suspended');
  assert.equal(source.itinerary.length, 3);
  assert.equal(source.itinerary[0]._id, 'schedule-1');
});

test('keeps the duplicated title within the 100 character limit', async () => {
  const calls = stubCreate();
  await runDuplicate(makeSourceTour({ title: 'A'.repeat(120) }));

  assert.ok(calls.payload.title.length <= 100);
  assert.ok(calls.payload.title.endsWith('(Bản sao)'));
});

test('returns 500 when the duplicated tour cannot be created', async () => {
  Tour.findById = async () => makeSourceTour();
  Tour.create = async () => {
    throw new Error('database unavailable');
  };
  const result = createResponse();

  await duplicateTour(
    { params: { id: 'tour-1' }, user: { _id: 'provider-1' }, body: {} },
    result.response
  );

  assert.equal(result.statusCode, 500);
  assert.equal(result.body.message, 'Không thể nhân bản tour');
});
