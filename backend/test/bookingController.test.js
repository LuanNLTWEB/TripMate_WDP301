import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Tour from '../src/models/Tour.js';
import { getProviderBookingRequests } from '../src/controllers/bookingController.js';

const originalTourFind = Tour.find;
const originalBookingCount = Booking.countDocuments;
const originalBookingFind = Booking.find;
const originalBookingAggregate = Booking.aggregate;

afterEach(() => {
  Tour.find = originalTourFind;
  Booking.countDocuments = originalBookingCount;
  Booking.find = originalBookingFind;
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
    cancelled: 0,
    confirmedRevenue: 0,
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
      { _id: 'confirmed', count: 2, guests: 5, totalAmount: 10000000 }
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
    total: 3,
    pending: 1,
    confirmed: 2,
    cancelled: 0,
    confirmedRevenue: 10000000,
    totalGuests: 7
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
