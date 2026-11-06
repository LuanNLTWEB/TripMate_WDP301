import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Departure from '../src/models/Departure.js';
import Itinerary from '../src/models/Itinerary.js';
import Review from '../src/models/Review.js';
import Tour from '../src/models/Tour.js';
import User from '../src/models/User.js';
import { deleteTour, getProviderTours, getTourById } from '../src/controllers/tourController.js';

const originals = {
  tourFindById: Tour.findById,
  tourFindByIdAndDelete: Tour.findByIdAndDelete,
  tourFind: Tour.find,
  tourCountDocuments: Tour.countDocuments,
  bookingCountDocuments: Booking.countDocuments,
  departureDeleteMany: Departure.deleteMany,
  reviewDeleteMany: Review.deleteMany,
  userUpdateMany: User.updateMany,
  itineraryUpdateMany: Itinerary.updateMany
};

afterEach(() => {
  Tour.findById = originals.tourFindById;
  Tour.findByIdAndDelete = originals.tourFindByIdAndDelete;
  Tour.find = originals.tourFind;
  Tour.countDocuments = originals.tourCountDocuments;
  Booking.countDocuments = originals.bookingCountDocuments;
  Departure.deleteMany = originals.departureDeleteMany;
  Review.deleteMany = originals.reviewDeleteMany;
  User.updateMany = originals.userUpdateMany;
  Itinerary.updateMany = originals.itineraryUpdateMany;
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

const makeTour = ({ status = 'pending', ownerId = 'provider-1', isDeleted = false } = {}) => {
  let saved = false;
  return {
    _id: 'tour-1',
    status,
    isDeleted,
    deletedAt: null,
    providerId: ownerId
      ? { equals: (value) => String(value) === ownerId }
      : null,
    async save() {
      saved = true;
    },
    get saved() {
      return saved;
    }
  };
};

// Chặn mọi thao tác xóa vật lý để khẳng định đây là xóa mềm
const blockPhysicalDelete = () => {
  const calls = { bookingsQuery: null, favorites: [], hardDeleted: false };
  Tour.findByIdAndDelete = async () => { calls.hardDeleted = true; };
  Departure.deleteMany = async () => { calls.hardDeleted = true; };
  Review.deleteMany = async () => { calls.hardDeleted = true; };
  Itinerary.updateMany = async () => { calls.hardDeleted = true; };
  Booking.countDocuments = async (query) => {
    calls.bookingsQuery = query;
    return 0;
  };
  User.updateMany = async (query, update) => { calls.favorites.push([query, update]); };
  return calls;
};

const runDelete = async (tour, user = { _id: 'provider-1' }) => {
  Tour.findById = async () => tour;
  const result = createResponse();
  await deleteTour({ params: { id: 'tour-1' }, user }, result.response);
  return result;
};

const makeQueryChain = (value) => {
  const chain = {
    populate: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
  };
  return chain;
};

test('returns 404 when the tour does not exist', async () => {
  const calls = blockPhysicalDelete();
  const result = await runDelete(null);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.message, 'Không tìm thấy tour');
  assert.equal(calls.hardDeleted, false);
});

test('returns 404 when the tour was already soft deleted', async () => {
  const calls = blockPhysicalDelete();
  const result = await runDelete(makeTour({ isDeleted: true }));

  assert.equal(result.statusCode, 404);
  assert.equal(calls.hardDeleted, false);
  assert.deepEqual(calls.favorites, []);
});

test('returns 403 when the provider does not own the tour', async () => {
  const calls = blockPhysicalDelete();
  const result = await runDelete(makeTour({ ownerId: 'provider-owner' }), { _id: 'provider-other' });

  assert.equal(result.statusCode, 403);
  assert.equal(result.body.message, 'Bạn không có quyền xóa tour này');
  assert.equal(calls.hardDeleted, false);
});

test('returns 403 for a tour without an owner', async () => {
  const calls = blockPhysicalDelete();
  const result = await runDelete(makeTour({ ownerId: null }));

  assert.equal(result.statusCode, 403);
  assert.equal(calls.hardDeleted, false);
});

test('refuses to delete an active tour', async () => {
  const calls = blockPhysicalDelete();
  const tour = makeTour({ status: 'active' });
  const result = await runDelete(tour);

  assert.equal(result.statusCode, 400);
  assert.match(result.body.message, /đang hoạt động/);
  assert.equal(tour.saved, false);
  assert.equal(calls.hardDeleted, false);
});

test('refuses to delete a tour that still has pending or confirmed bookings', async () => {
  const calls = blockPhysicalDelete();
  calls.bookingsQuery = null;
  Booking.countDocuments = async (query) => {
    calls.bookingsQuery = query;
    return 3;
  };
  const tour = makeTour({ status: 'suspended' });
  const result = await runDelete(tour);

  assert.equal(result.statusCode, 400);
  assert.match(result.body.message, /đã có khách đặt/);
  assert.deepEqual(calls.bookingsQuery.status.$in, ['pending', 'confirmed']);
  assert.equal(tour.saved, false);
  assert.equal(calls.hardDeleted, false);
});

test('soft deletes the tour, keeps records and only removes it from favorites', async () => {
  const calls = blockPhysicalDelete();
  const tour = makeTour({ status: 'needs_revision' });
  const result = await runDelete(tour);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(tour.saved, true);
  assert.equal(tour.isDeleted, true);
  assert.ok(tour.deletedAt instanceof Date);
  assert.equal(calls.hardDeleted, false, 'must not physically remove any record');
  assert.deepEqual(calls.favorites, [
    [{ favoriteTours: 'tour-1' }, { $pull: { favoriteTours: 'tour-1' } }]
  ]);
});

test('returns 500 when the tour cannot be updated', async () => {
  blockPhysicalDelete();
  Tour.findById = async () => ({
    _id: 'tour-1',
    status: 'pending',
    isDeleted: false,
    providerId: { equals: () => true },
    async save() {
      throw new Error('database unavailable');
    }
  });
  const result = createResponse();
  await deleteTour({ params: { id: 'tour-1' }, user: { _id: 'provider-1' } }, result.response);

  assert.equal(result.statusCode, 500);
  assert.equal(result.body.message, 'Không thể xóa tour');
});

test('keeps soft deleted tours out of the provider tour list', async () => {
  let capturedQuery = null;
  Tour.countDocuments = async (query) => {
    capturedQuery = query;
    return 0;
  };
  Tour.find = () => makeQueryChain([]);
  const result = createResponse();

  await getProviderTours({
    user: { _id: 'provider-1' },
    query: { search: '', status: 'all', page: 1, limit: 10 }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.ok(
    capturedQuery.$and.some((filter) => JSON.stringify(filter) === JSON.stringify({ isDeleted: { $ne: true } })),
    'provider list must exclude soft deleted tours'
  );
});

test('returns 404 when a soft deleted tour is requested by id', async () => {
  Tour.findById = () => makeQueryChain({ _id: 'tour-1', isDeleted: true });
  const result = createResponse();

  await getTourById({ params: { id: 'tour-1' } }, result.response);

  assert.equal(result.statusCode, 404);
});
