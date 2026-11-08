import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import Tour from '../src/models/Tour.js';
import User from '../src/models/User.js';
import {
  createBooking,
  respondProviderBooking,
  getBookingVoucher,
  markBookingAsNoShow,
  resetNoShowCount
} from '../src/controllers/bookingController.js';

const originalBookingFindById = Booking.findById;
const originalBookingFindOne = Booking.findOne;
const originalBookingCreate = Booking.create;
const originalTourFindById = Tour.findById;
const originalTourFindOne = Tour.findOne;
const originalUserFindById = User.findById;

afterEach(() => {
  Booking.findById = originalBookingFindById;
  Booking.findOne = originalBookingFindOne;
  Booking.create = originalBookingCreate;
  Tour.findById = originalTourFindById;
  Tour.findOne = originalTourFindOne;
  User.findById = originalUserFindById;
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

// UC-78: Respond to Booking
test('UC-78: allows provider to reject a pending booking with a valid reason', async () => {
  let savedBooking = false;
  const bookingDoc = {
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'pending',
    numberOfPeople: 2,
    async save() { savedBooking = true; return this; }
  };
  bookingDoc.populate = () => ({ populate: async () => bookingDoc });
  Booking.findById = (id) => {
    if (id === 'booking-1') {
      return bookingDoc;
    }
    return Promise.resolve(null);
  };
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1',
    availableSeats: 10
  });

  const res = createResponse();
  await respondProviderBooking({
    params: { id: 'booking-1' },
    user: { _id: 'provider-1' },
    body: {
      action: 'reject',
      rejectionReason: 'Hiện tại thời tiết xấu không thể khởi hành đoàn.'
    }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(savedBooking, true);
  assert.equal(bookingDoc.status, 'rejected');
  assert.equal(bookingDoc.rejectionReason, 'Hiện tại thời tiết xấu không thể khởi hành đoàn.');
  assert.ok(bookingDoc.respondedAt);
  assert.equal(bookingDoc.respondedBy, 'provider-1');
});

test('UC-78: rejects response when booking is already confirmed or cancelled (409)', async () => {
  Booking.findById = async () => ({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed'
  });
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1'
  });

  const res = createResponse();
  await respondProviderBooking({
    params: { id: 'booking-1' },
    user: { _id: 'provider-1' },
    body: { action: 'reject', rejectionReason: 'Không nhận khách nữa.' }
  }, res.response);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

// UC-82: Download Booking Voucher
test('UC-82: returns voucher with shortCode and qrData for confirmed booking', async () => {
  const confirmedBooking = {
    _id: '507f191e810c19729de860ea',
    customerId: 'customer-1',
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    numberOfPeople: 2,
    totalPrice: 3000000,
    departureDate: new Date('2026-12-01'),
    status: 'confirmed',
    tourId: {
      title: 'Tour Bà Nà Hills',
      departureLocation: 'Đà Nẵng',
      providerId: { username: 'danangtour', email: 'provider@example.com' }
    }
  };

  Booking.findOne = () => ({
    populate: async () => confirmedBooking
  });

  const res = createResponse();
  await getBookingVoucher({
    params: { id: '507f191e810c19729de860ea' },
    user: { _id: 'customer-1' }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.shortCode, 'BK-E860EA');
  assert.ok(res.body.data.qrData.includes('BK-E860EA'));
  assert.ok(res.body.data.qrData.includes('Tour Bà Nà Hills'));
});

test('UC-82: rejects voucher when booking status is not confirmed (400)', async () => {
  Booking.findOne = () => ({
    populate: async () => ({
      _id: 'booking-pending',
      customerId: 'customer-1',
      status: 'pending'
    })
  });

  const res = createResponse();
  await getBookingVoucher({
    params: { id: 'booking-pending' },
    user: { _id: 'customer-1' }
  }, res.response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

// UC-86: Mark Booking as No-Show & Restriction
test('UC-86: marks confirmed booking as no-show and restricts customer on 2nd violation', async () => {
  let savedBooking = false;
  let savedCustomer = false;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  const bookingDoc = {
    _id: 'booking-1',
    tourId: 'tour-1',
    customerId: 'customer-1',
    status: 'confirmed',
    departureDate: pastDate,
    async save() { savedBooking = true; return this; }
  };
  bookingDoc.populate = () => ({ populate: async () => bookingDoc });

  const customerUser = {
    _id: 'customer-1',
    noShowCount: 1, // Already had 1 no-show -> this will be 2nd!
    isBookingRestricted: false,
    async save() { savedCustomer = true; return this; }
  };

  Booking.findById = (id) => {
    if (id === 'booking-1') {
      return bookingDoc;
    }
    return Promise.resolve(null);
  };
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1'
  });
  User.findById = async () => customerUser;

  const res = createResponse();
  await markBookingAsNoShow({
    params: { id: 'booking-1' },
    user: { _id: 'provider-1' },
    body: { noShowReason: 'Khách không đến điểm tập trung xe bus' }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(savedBooking, true);
  assert.equal(savedCustomer, true);
  assert.equal(bookingDoc.status, 'no_show');
  assert.equal(bookingDoc.noShowReason, 'Khách không đến điểm tập trung xe bus');
  assert.equal(customerUser.noShowCount, 2);
  assert.equal(customerUser.isBookingRestricted, true);
  assert.equal(res.body.isCustomerRestricted, true);
});

test('UC-86: rejects marking no-show before departure date (400)', async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);

  Booking.findById = async () => ({
    _id: 'booking-1',
    tourId: 'tour-1',
    status: 'confirmed',
    departureDate: futureDate
  });
  Tour.findById = async () => ({
    _id: 'tour-1',
    providerId: 'provider-1'
  });

  const res = createResponse();
  await markBookingAsNoShow({
    params: { id: 'booking-1' },
    user: { _id: 'provider-1' },
    body: {}
  }, res.response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test('UC-86: blocks booking creation when customer is restricted (403)', async () => {
  User.findById = () => ({
    select: async () => ({ isBookingRestricted: true, noShowCount: 2 })
  });

  const res = createResponse();
  await createBooking({
    params: { tourId: 'tour-1' },
    user: { _id: 'customer-restricted' },
    body: {
      fullName: 'Khách Vi Phạm',
      phone: '0901234567',
      email: 'restricted@example.com',
      numberOfPeople: 2,
      departureDate: new Date('2026-12-01')
    }
  }, res.response);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /hạn chế đặt chỗ/);
});

// START STT 156 Reset No-Show Count Tests
test('STT 156: resetNoShowCount resets noShowCount to 0 and removes booking restriction', async () => {
  let saved = false;
  const userDoc = {
    _id: 'customer-1',
    username: 'khach1',
    email: 'khach1@example.com',
    noShowCount: 2,
    isBookingRestricted: true,
    bookingRestrictedAt: new Date(),
    save: async () => { saved = true; }
  };

  User.findById = async () => userDoc;

  const res = createResponse();
  await resetNoShowCount({
    params: { userId: 'customer-1' },
    body: { reason: 'Khách bị no-show oan do thời tiết xấu' }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(userDoc.noShowCount, 0);
  assert.equal(userDoc.isBookingRestricted, false);
  assert.equal(saved, true);
});

test('STT 156: resetNoShowCount returns 404 when user not found', async () => {
  User.findById = async () => null;

  const res = createResponse();
  await resetNoShowCount({
    params: { userId: 'non-existent' },
    body: {}
  }, res.response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});
// END STT 156 Reset No-Show Count Tests
