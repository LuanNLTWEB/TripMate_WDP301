import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Tour from '../src/models/Tour.js';
import TourCategory from '../src/models/TourCategory.js';
import { restoreTour, updateProviderTour } from '../src/controllers/tourController.js';

const originalTourFindById = Tour.findById;
const originalBookingAggregate = Booking.aggregate;
const originalCategoryFindById = TourCategory.findById;

afterEach(() => {
  Tour.findById = originalTourFindById;
  Booking.aggregate = originalBookingAggregate;
  TourCategory.findById = originalCategoryFindById;
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

const validPayload = (overrides = {}) => ({
  title: 'Tour Đà Nẵng cập nhật',
  description: 'Hành trình khám phá Đà Nẵng với nhiều trải nghiệm hấp dẫn.',
  location: 'Đà Nẵng',
  departureLocation: 'Hồ Chí Minh',
  destinationLocation: 'Đà Nẵng',
  duration: '3 ngày 2 đêm',
  price: 3500000,
  availableSeats: 20,
  categoryId: null,
  images: ['https://example.com/tour.jpg'],
  ...overrides
});

const makeTour = (status = 'active', ownerId = 'provider-1') => {
  let saved = false;
  return {
    _id: 'tour-1',
    providerId: { equals: (value) => String(value) === ownerId },
    status,
    revisionNote: 'Cần bổ sung mô tả',
    revisionRequestedAt: new Date(),
    revisionRequestedBy: 'staff-1',
    rejectionReason: 'Thông tin chưa chính xác',
    rejectedAt: new Date(),
    rejectedBy: 'staff-1',
    async save() {
      saved = true;
    },
    async populate() {
      return this;
    },
    get saved() {
      return saved;
    }
  };
};

test('updates an active tour and sends it back to pending review', async () => {
  const tour = makeTour('active');
  Tour.findById = async () => tour;
  Booking.aggregate = async () => [{ _id: null, seats: 4 }];
  const result = createResponse();

  await updateProviderTour({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: validPayload()
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.requiresReview, true);
  assert.equal(result.body.confirmedSeats, 4);
  assert.equal(tour.status, 'pending');
  assert.equal(tour.title, 'Tour Đà Nẵng cập nhật');
  assert.equal(tour.revisionNote, '');
  assert.equal(tour.rejectionReason, '');
  assert.equal(tour.saved, true);
});

test('keeps a suspended tour suspended after its information is updated', async () => {
  const tour = makeTour('suspended');
  Tour.findById = async () => tour;
  Booking.aggregate = async () => [];
  const result = createResponse();

  await updateProviderTour({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: validPayload()
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.requiresReview, false);
  assert.equal(tour.status, 'suspended');
  assert.equal(tour.saved, true);
});

test('does not allow capacity below seats in confirmed bookings', async () => {
  const tour = makeTour('pending');
  Tour.findById = async () => tour;
  Booking.aggregate = async () => [{ _id: null, seats: 8 }];
  const result = createResponse();

  await updateProviderTour({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: validPayload({ availableSeats: 5 })
  }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.confirmedSeats, 8);
  assert.equal(tour.saved, false);
});

test('does not resubmit an active tour when no field changed', async () => {
  const payload = validPayload();
  const tour = Object.assign(makeTour('active'), payload);
  Tour.findById = async () => tour;
  Booking.aggregate = () => {
    throw new Error('Booking aggregation must not run without changes');
  };
  const result = createResponse();

  await updateProviderTour({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: payload
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.requiresReview, false);
  assert.equal(tour.status, 'active');
  assert.equal(tour.saved, false);
});

test('rejects updates from a provider who does not own the tour', async () => {
  const tour = makeTour('pending', 'provider-owner');
  Tour.findById = async () => tour;
  Booking.aggregate = () => {
    throw new Error('Booking aggregation must not run for unauthorized provider');
  };
  const result = createResponse();

  await updateProviderTour({
    params: { id: 'tour-1' },
    user: { _id: 'provider-other' },
    body: validPayload()
  }, result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(tour.saved, false);
});

test('rejects a category that no longer exists', async () => {
  const tour = makeTour('pending');
  Tour.findById = async () => tour;
  TourCategory.findById = () => ({
    select: () => ({ lean: async () => null })
  });
  const result = createResponse();

  await updateProviderTour({
    params: { id: 'tour-1' },
    user: { _id: 'provider-1' },
    body: validPayload({ categoryId: 'category-missing' })
  }, result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(tour.saved, false);
});

test('restores only a suspended tour and clears suspension audit fields', async () => {
  const tour = Object.assign(makeTour('suspended'), {
    suspensionReason: 'Cần kiểm tra thông tin tour',
    suspendedAt: new Date(),
    suspendedBy: 'staff-1'
  });
  Tour.findById = async () => tour;
  const result = createResponse();

  await restoreTour({ params: { id: 'tour-1' } }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, 'Đã kích hoạt lại tour');
  assert.equal(tour.status, 'active');
  assert.equal(tour.suspensionReason, '');
  assert.equal(tour.suspendedAt, null);
  assert.equal(tour.suspendedBy, null);
  assert.equal(tour.saved, true);
});

test('rejects restoring a tour that is not suspended', async () => {
  const tour = makeTour('rejected');
  Tour.findById = async () => tour;
  const result = createResponse();

  await restoreTour({ params: { id: 'tour-1' } }, result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.message, 'Chỉ có thể khôi phục tour đang tạm ngưng');
  assert.equal(tour.status, 'rejected');
  assert.equal(tour.saved, false);
});
