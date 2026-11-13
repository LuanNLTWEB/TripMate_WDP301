import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import Departure from '../src/models/Departure.js';
import Booking from '../src/models/Booking.js';
import { checkTourAvailability } from '../src/controllers/tourController.js';

const originalTourFindById = Tour.findById;
const originalDepartureFind = Departure.find;
const originalBookingFind = Booking.find;

afterEach(() => {
  Tour.findById = originalTourFindById;
  Departure.find = originalDepartureFind;
  Booking.find = originalBookingFind;
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

test('checkTourAvailability returns departure custom price when set and falls back to tour price when null', async () => {
  Tour.findById = async () => ({
    _id: 'tour-1',
    price: 10000000,
    availableSeats: 20,
    isDeleted: false,
    status: 'active'
  });

  const departuresData = [
    {
      _id: 'dep-1',
      departureDate: new Date('2026-11-20T00:00:00.000Z'),
      availableSeats: 15,
      price: 8500000,
      note: '6h'
    },
    {
      _id: 'dep-2',
      departureDate: new Date('2026-11-21T00:00:00.000Z'),
      availableSeats: 10,
      price: null,
      note: '7h'
    }
  ];

  Departure.find = () => ({
    sort: async () => departuresData
  });

  Booking.find = () => ({
    select: async () => []
  });

  const result = createResponse();
  await checkTourAvailability({
    params: { id: 'tour-1' },
    query: { date: '2026-11-20' }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.defaultPrice, 10000000);
  assert.equal(result.body.data.departures.length, 2);
  assert.equal(result.body.data.departures[0].price, 8500000);
  assert.equal(result.body.data.departures[0].hasDeparture, true);
  assert.equal(result.body.data.departures[1].price, 10000000);
  assert.equal(result.body.data.departures[1].hasDeparture, true);
  assert.equal(result.body.data.selectedDateAvailability.price, 8500000);
  assert.equal(result.body.data.selectedDateAvailability.hasDeparture, true);
});

test('checkTourAvailability returns unavailable with hasDeparture=false when requested date has no scheduled departure', async () => {
  Tour.findById = async () => ({
    _id: 'tour-1',
    price: 5490000,
    availableSeats: 16,
    isDeleted: false,
    status: 'active'
  });

  Departure.find = () => ({
    sort: async () => [
      {
        _id: 'dep-1',
        departureDate: new Date('2026-11-20T00:00:00.000Z'),
        availableSeats: 10,
        price: 5490000,
        note: ''
      }
    ]
  });

  Booking.find = () => ({
    select: async () => []
  });

  const result = createResponse();
  await checkTourAvailability({
    params: { id: 'tour-1' },
    query: { date: '2026-11-30' }
  }, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.selectedDateAvailability._id, null);
  assert.equal(result.body.data.selectedDateAvailability.hasDeparture, false);
  assert.equal(result.body.data.selectedDateAvailability.isAvailable, false);
  assert.equal(result.body.data.selectedDateAvailability.remainingSeats, 0);
  assert.equal(result.body.data.selectedDateAvailability.capacity, 0);
  assert.equal(result.body.data.selectedDateAvailability.price, null);
});
