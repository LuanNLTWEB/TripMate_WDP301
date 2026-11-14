import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import ExcelJS from 'exceljs';
import Tour from '../src/models/Tour.js';
import Departure from '../src/models/Departure.js';
import Booking from '../src/models/Booking.js';
import Notification from '../src/models/Notification.js';
import Destination from '../src/models/Destination.js';
import Itinerary from '../src/models/Itinerary.js';
import TourCategory from '../src/models/TourCategory.js';
import { updateDeparture, exportPassengerManifest } from '../src/controllers/departureController.js';
import { requestTourRevision } from '../src/controllers/tourController.js';
import { updateDestination } from '../src/controllers/destinationController.js';
import { duplicateItinerary } from '../src/controllers/itineraryController.js';
import { createCategory, updateCategory } from '../src/controllers/tourCategoryController.js';

const originals = {
  DepartureFindById: Departure.findById,
  DepartureFindOne: Departure.findOne,
  BookingFind: Booking.find,
  NotificationCreate: Notification.create,
  NotificationInsertMany: Notification.insertMany,
  TourFindById: Tour.findById,
  DestinationFindOne: Destination.findOne,
  ItineraryFindById: Itinerary.findById,
  TourCategoryFindOne: TourCategory.findOne,
  TourCategoryFindById: TourCategory.findById,
  TourCategoryCreate: TourCategory.create
};

afterEach(() => {
  Departure.findById = originals.DepartureFindById;
  Departure.findOne = originals.DepartureFindOne;
  Booking.find = originals.BookingFind;
  Notification.create = originals.NotificationCreate;
  Notification.insertMany = originals.NotificationInsertMany;
  Tour.findById = originals.TourFindById;
  Destination.findOne = originals.DestinationFindOne;
  Itinerary.findById = originals.ItineraryFindById;
  TourCategory.findOne = originals.TourCategoryFindOne;
  TourCategory.findById = originals.TourCategoryFindById;
  TourCategory.create = originals.TourCategoryCreate;
});

const createResponse = () => {
  const output = { statusCode: 200, body: null, headers: {}, chunks: [] };
  output.response = {
    status(code) {
      output.statusCode = code;
      return this;
    },
    json(body) {
      output.body = body;
      return this;
    },
    set(headers) {
      Object.assign(output.headers, headers);
      return this;
    },
    write(chunk) {
      output.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    },
    end(chunk) {
      if (chunk) output.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return this;
    },
    once() { return this; },
    on() { return this; },
    emit() { return false; }
  };
  return output;
};

test('UC-42: rejects changing departureDate when active bookings exist on the slot', async () => {
  const dep = {
    _id: 'dep-1',
    tourId: 'tour-1',
    providerId: { equals: (id) => String(id) === 'prov-1' },
    departureDate: new Date('2026-12-10T00:00:00.000Z'),
    availableSeats: 20,
    note: '',
    async save() {}
  };
  Departure.findById = async () => dep;
  Booking.find = () => ({
    select: async () => [{ customerId: 'cus-1', numberOfPeople: 3, status: 'confirmed' }]
  });

  const res = createResponse();
  await updateDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'prov-1' },
    body: { departureDate: '2026-12-15T00:00:00.000Z', availableSeats: 20 }
  }, res.response);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

test('UC-42: rejects reducing availableSeats below booked seats and allows price update on same date', async () => {
  let saved = false;
  const dep = {
    _id: 'dep-1',
    tourId: 'tour-1',
    providerId: { equals: (id) => String(id) === 'prov-1' },
    departureDate: new Date('2026-12-10T00:00:00.000Z'),
    availableSeats: 20,
    price: null,
    note: '',
    async save() { saved = true; }
  };
  Departure.findById = async () => dep;
  Booking.find = () => ({
    select: async () => [{ customerId: 'cus-1', numberOfPeople: 5, status: 'confirmed' }]
  });

  const resLowSeats = createResponse();
  await updateDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'prov-1' },
    body: { departureDate: '2026-12-10T00:00:00.000Z', availableSeats: 4 }
  }, resLowSeats.response);

  assert.equal(resLowSeats.statusCode, 400);
  assert.equal(saved, false);

  const resPriceOnly = createResponse();
  await updateDeparture({
    params: { id: 'dep-1' },
    user: { _id: 'prov-1' },
    body: { departureDate: '2026-12-10T00:00:00.000Z', availableSeats: 18, price: 3200000 }
  }, resPriceOnly.response);

  assert.equal(resPriceOnly.statusCode, 200);
  assert.equal(saved, true);
  assert.equal(dep.availableSeats, 18);
  assert.equal(dep.price, 3200000);
});

test('UC-122: exportPassengerManifest sanitizes formula-injection prefixes in Excel output', async () => {
  Departure.findById = async () => ({
    _id: 'dep-1',
    tourId: 'tour-1',
    providerId: { equals: (id) => String(id) === 'prov-1' },
    departureDate: new Date('2026-12-10T00:00:00.000Z')
  });
  Tour.findById = () => ({
    populate: () => ({
      select: async () => ({
        title: '=SUM(A1:A2)',
        duration: '2 ngày 1 đêm',
        departureLocation: 'Hà Nội',
        destinationLocation: 'Sa Pa',
        categoryId: { name: 'Nghỉ dưỡng' }
      })
    })
  });
  Booking.find = () => ({
    sort: async () => [
      {
        _id: '0123456789abcdef01234567',
        fullName: '=HYPERLINK("http://evil.example")',
        phone: '+84901234567',
        email: 'test@example.com',
        numberOfPeople: 2,
        totalPrice: 5000000,
        status: 'confirmed',
        note: '@cmd|calc'
      }
    ]
  });

  const res = createResponse();
  await exportPassengerManifest({
    params: { id: 'dep-1' },
    user: { _id: 'prov-1', username: 'Partner', phone: '0901234567' }
  }, res.response);

  assert.equal(res.statusCode, 200);
  const buffer = Buffer.concat(res.chunks);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet(1);

  assert.equal(sheet.getCell('A6').value, 'Tour: =SUM(A1:A2)');
  assert.equal(sheet.getRow(11).getCell(3).value, "'=HYPERLINK(\"http://evil.example\")");
  assert.equal(sheet.getRow(11).getCell(4).value, "'+84901234567");
  assert.equal(sheet.getRow(11).getCell(12).value, "'@cmd|calc");
});

test('UC-99: requestTourRevision creates notification for owning provider', async () => {
  let notifiedPayload = null;
  const tourDoc = {
    _id: 'tour-1',
    title: 'Tour Đà Lạt',
    providerId: 'prov-1',
    status: 'pending',
    isDeleted: false,
    async save() {},
    async populate() { return this; }
  };
  Tour.findById = async () => tourDoc;
  Notification.create = async (payload) => {
    notifiedPayload = payload;
    return payload;
  };

  const res = createResponse();
  await requestTourRevision({
    params: { id: 'tour-1' },
    user: { _id: 'staff-1' },
    body: { note: 'Vui lòng bổ sung lịch trình chi tiết từng ngày.' }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(tourDoc.status, 'needs_revision');
  assert.ok(notifiedPayload);
  assert.equal(notifiedPayload.recipient, 'prov-1');
  assert.equal(notifiedPayload.notificationType, 'tour_submission_result');
});

test('UC-19: updateDestination rejects duplicate name in same location (case-insensitive)', async () => {
  Destination.findOne = async (query) => {
    if (query._id && typeof query._id === 'object' && '$ne' in query._id) {
      return { _id: 'dest-other', name: 'Bà Nà Hills', location: 'Đà Nẵng' };
    }
    return { _id: 'dest-1', name: 'Cầu Rồng', location: 'Đà Nẵng' };
  };

  const res = createResponse();
  await updateDestination({
    params: { id: 'dest-1' },
    user: { _id: 'staff-1' },
    body: { name: 'bà nà hills', location: 'đà nẵng' }
  }, res.response);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

test('UC-62: duplicateItinerary rejects startDate in the past', async () => {
  Itinerary.findById = async () => ({
    _id: 'itin-1',
    title: 'Trip cũ',
    owner: 'user-1',
    collaborators: [],
    startDate: new Date('2026-11-20T00:00:00.000Z')
  });

  const res = createResponse();
  await duplicateItinerary({
    params: { id: 'itin-1' },
    user: { _id: 'user-1' },
    body: { startDate: '2020-01-01' }
  }, res.response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('UC-138 / UC-139: tour category rejects case-insensitive duplicate names', async () => {
  TourCategory.findOne = async (query) => {
    assert.ok(query.name instanceof RegExp);
    assert.equal(query.name.test('du lịch biển'), true);
    return { _id: 'cat-other', name: 'Du lịch biển' };
  };

  const createRes = createResponse();
  await createCategory({ body: { name: '  DU LỊCH BIỂN  ' } }, createRes.response);
  assert.equal(createRes.statusCode, 400);

  TourCategory.findById = async () => ({ _id: 'cat-1', name: 'Leo núi', description: '' });
  const updateRes = createResponse();
  await updateCategory({ params: { id: 'cat-1' }, body: { name: 'du lịch biển' } }, updateRes.response);
  assert.equal(updateRes.statusCode, 400);
});

