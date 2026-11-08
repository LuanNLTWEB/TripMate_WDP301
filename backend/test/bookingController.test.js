import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Tour from '../src/models/Tour.js';
import {
  getProviderBookingRequests,
  confirmBookingPayment,
  checkInBooking,
  completeBooking
} from '../src/controllers/bookingController.js';

const originalTourFind = Tour.find;
const originalTourFindById = Tour.findById;
const originalBookingCount = Booking.countDocuments;
const originalBookingFind = Booking.find;
const originalBookingFindById = Booking.findById;
const originalBookingAggregate = Booking.aggregate;

afterEach(() => {
  Tour.find = originalTourFind;
  Tour.findById = originalTourFindById;
  Booking.countDocuments = originalBookingCount;
  Booking.find = originalBookingFind;
  Booking.findById = originalBookingFindById;
  Booking.aggregate = originalBookingAggregate;
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

const mockProviderTours = (tours) => {
  Tour.find = (query) => {
    assert.deepEqual(query, { providerId: 'provider-1' });
    return {
      select: () => ({
        lean: async () => tours
      })
    };
  };
};

const createBookingFindChain = (records, capture) => ({
  populate() {
    return this;
  },
  sort(sort) {
    capture.sort = sort;
    return this;
  },
  skip(value) {
    capture.skip = value;
    return this;
  },
  limit(value) {
    capture.limit = value;
    return Promise.resolve(records);
  }
});

test('returns an empty result without querying bookings when provider owns no tours', async () => {
  mockProviderTours([]);
  Booking.countDocuments = () => {
    throw new Error('Booking query must not run');
  };

  const result = createResponse();
  await getProviderBookingRequests({
    user: { _id: 'provider-1' },
    query: {}
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data, []);
  assert.deepEqual(result.body.summary, {
    total: 0,
    pending: 0,
    confirmed: 0,
    paid: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    confirmedRevenue: 0,
    collectedRevenue: 0,
    totalGuests: 0
  });
});

test('scopes results and summary to tours owned by the authenticated provider', async () => {
  const ownedTourId = 'tour-owned';
  mockProviderTours([{
    _id: ownedTourId,
    title: 'Khám phá Đà Nẵng',
    departureLocation: 'Hồ Chí Minh',
    destinationLocation: 'Đà Nẵng'
  }]);

  let countQuery;
  let findQuery;
  let aggregatePipeline;
  const chainCapture = {};
  Booking.countDocuments = async (query) => {
    countQuery = query;
    return 1;
  };
  Booking.aggregate = async (pipeline) => {
    aggregatePipeline = pipeline;
    return [
      { _id: 'pending', count: 1, guests: 2, totalAmount: 4000000 },
      { _id: 'confirmed', count: 2, guests: 5, totalAmount: 10000000 },
      { _id: 'paid', count: 1, guests: 3, totalAmount: 6000000 }
    ];
  };
  Booking.find = (query) => {
    findQuery = query;
    return createBookingFindChain([{ _id: 'booking-1', status: 'pending' }], chainCapture);
  };

  const result = createResponse();
  await getProviderBookingRequests({
    user: { _id: 'provider-1' },
    query: { status: 'pending', page: 1, limit: 10 }
  }, result.response);

  const expectedScope = { tourId: { $in: [ownedTourId] } };
  assert.deepEqual(countQuery, { ...expectedScope, status: 'pending' });
  assert.deepEqual(findQuery, { ...expectedScope, status: 'pending' });
  assert.deepEqual(aggregatePipeline[0], { $match: expectedScope });
  assert.deepEqual(chainCapture.sort, { createdAt: -1 });
  assert.equal(chainCapture.skip, 0);
  assert.equal(chainCapture.limit, 10);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.total, 1);
  assert.deepEqual(result.body.summary, {
    total: 4,
    pending: 1,
    confirmed: 2,
    paid: 1,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
    confirmedRevenue: 10000000,
    collectedRevenue: 6000000,
    totalGuests: 10
  });
});

test('escapes search input and includes matching owned tours in the booking query', async () => {
  const matchingTourId = 'tour-match';
  mockProviderTours([
    { _id: matchingTourId, title: 'Tour Đà Nẵng (3N2Đ)' },
    { _id: 'tour-other', title: 'Khám phá Hà Nội' }
  ]);

  let capturedQuery;
  Booking.countDocuments = async (query) => {
    capturedQuery = query;
    return 0;
  };
  Booking.aggregate = async () => [];
  Booking.find = () => createBookingFindChain([], {});

  const result = createResponse();
  await getProviderBookingRequests({
    user: { _id: 'provider-1' },
    query: { search: 'Đà Nẵng (3N2Đ)', page: 3, limit: 5 }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.currentPage, 1);
  assert.equal(result.body.totalPages, 0);
  assert.equal(capturedQuery.$or.length, 4);
  assert.deepEqual(capturedQuery.$or[3], { tourId: { $in: [matchingTourId] } });
  assert.equal(capturedQuery.$or[0].fullName.test('Đà Nẵng (3N2Đ)'), true);
  assert.equal(capturedQuery.$or[0].fullName.test('Đà Nẵng 3N2Đ'), false);
});

// START UC-85 Confirm Payment & Check-in

// Booking.findById vừa dùng để lấy document (await), vừa dùng để đọc lại kèm populate (chainable).
const mockBookingDocument = (booking) => {
  const doc = {
    ...booking,
    save: async () => doc
  };
  // Vừa await được (thenable) vừa populate chainable như query của Mongoose.
  const chain = {
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
    populate: () => chain
  };
  Booking.findById = () => chain;
  return doc;
};

const mockOwnedTour = (providerId = 'provider-1') => {
  Tour.findById = async () => ({ _id: 'tour-1', providerId });
};

const providerRequest = (overrides = {}) => ({
  params: { id: 'booking-1' },
  user: { _id: 'provider-1' },
  body: {},
  ...overrides
});

test('provider confirms collected cash and the booking becomes paid', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await confirmBookingPayment(providerRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(doc.status, 'paid');
  assert.equal(doc.paymentMethod, 'cash');
  assert.ok(doc.paidAt instanceof Date);
  assert.equal(result.body.paymentMethod, 'cash');
});

test('provider records a direct bank transfer when requested', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed',
    totalPrice: 3200000,
    numberOfPeople: 1
  });
  mockOwnedTour();

  const result = createResponse();
  await confirmBookingPayment(providerRequest({ body: { paymentMethod: 'bank_transfer' } }), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(doc.status, 'paid');
  assert.equal(doc.paymentMethod, 'bank_transfer');
});

test('rejects payment confirmation for a booking of another provider', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour('provider-2');

  const result = createResponse();
  await confirmBookingPayment(providerRequest(), result.response);

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'confirmed');
});

test('rejects payment confirmation for a booking that is not confirmed yet', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'pending',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await confirmBookingPayment(providerRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'pending');
});

test('rejects a second payment confirmation for the same booking', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'paid',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await confirmBookingPayment(providerRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'paid');
});

test('provider checks in guests of a paid booking', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'paid',
    totalPrice: 5000000,
    numberOfPeople: 3
  });
  mockOwnedTour();

  const result = createResponse();
  await checkInBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(doc.status, 'checked_in');
  assert.ok(doc.checkedInAt instanceof Date);
});

test('check-in requires the payment to be recorded first', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed',
    totalPrice: 5000000,
    numberOfPeople: 3
  });
  mockOwnedTour();

  const result = createResponse();
  await checkInBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'confirmed');
});

test('rejects checking in the same booking twice', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'checked_in',
    totalPrice: 5000000,
    numberOfPeople: 3
  });
  mockOwnedTour();

  const result = createResponse();
  await checkInBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'checked_in');
});
// END UC-85 Confirm Payment & Check-in

test('provider marks paid booking as completed', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'paid',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await completeBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(doc.status, 'completed');
  assert.ok(doc.completedAt instanceof Date);
});

test('provider marks checked_in booking as completed', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'checked_in',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await completeBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(doc.status, 'completed');
  assert.ok(doc.completedAt instanceof Date);
});

test('rejects completing a booking that is not paid or checked in', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await completeBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'confirmed');
});

test('rejects completing a booking that is already completed', async () => {
  const doc = mockBookingDocument({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'completed',
    totalPrice: 5000000,
    numberOfPeople: 2
  });
  mockOwnedTour();

  const result = createResponse();
  await completeBooking(providerRequest(), result.response);

  assert.equal(result.statusCode, 409);
  assert.equal(result.body.success, false);
  assert.equal(doc.status, 'completed');
});
