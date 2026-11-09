import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Booking from '../src/models/Booking.js';
import { updateBookingPassengerInfo } from '../src/controllers/bookingController.js';

const originalFindById = Booking.findById;

afterEach(() => {
  Booking.findById = originalFindById;
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

test('updateBookingPassengerInfo returns 404 when booking is not found', async () => {
  Booking.findById = () => Promise.resolve(null);

  const res = createResponse();
  await updateBookingPassengerInfo(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: {
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana@gmail.com'
      },
      user: { _id: '507f1f77bcf86cd799439001' }
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test('updateBookingPassengerInfo returns 403 when customer does not own the booking', async () => {
  const fakeBooking = {
    _id: '507f1f77bcf86cd799439011',
    customerId: '507f1f77bcf86cd799439999',
    status: 'pending'
  };
  Booking.findById = () => Promise.resolve(fakeBooking);

  const res = createResponse();
  await updateBookingPassengerInfo(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: {
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana@gmail.com'
      },
      user: { _id: '507f1f77bcf86cd799439001' }
    },
    res.response
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test('updateBookingPassengerInfo returns 409 when booking is already checked_in, completed, or cancelled', async () => {
  const fakeBooking = {
    _id: '507f1f77bcf86cd799439011',
    customerId: '507f1f77bcf86cd799439001',
    status: 'cancelled'
  };
  Booking.findById = () => Promise.resolve(fakeBooking);

  const res = createResponse();
  await updateBookingPassengerInfo(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: {
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana@gmail.com'
      },
      user: { _id: '507f1f77bcf86cd799439001' }
    },
    res.response
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

test('updateBookingPassengerInfo returns 409 when passengerUpdateCount reaches limit', async () => {
  const fakeBooking = {
    _id: '507f1f77bcf86cd799439011',
    customerId: '507f1f77bcf86cd799439001',
    status: 'pending',
    passengerUpdateCount: 3
  };
  Booking.findById = () => Promise.resolve(fakeBooking);

  const res = createResponse();
  await updateBookingPassengerInfo(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: {
        fullName: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'vana@gmail.com'
      },
      user: { _id: '507f1f77bcf86cd799439001' }
    },
    res.response
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /giới hạn tối đa/);
});

test('updateBookingPassengerInfo updates fields and returns 200 for active booking', async () => {
  let saved = false;
  const fakeBooking = {
    _id: '507f1f77bcf86cd799439011',
    customerId: '507f1f77bcf86cd799439001',
    status: 'confirmed',
    fullName: 'Cũ',
    phone: '0900000000',
    email: 'old@gmail.com',
    address: 'Địa chỉ cũ',
    note: '',
    passengerUpdateCount: 0,
    save: async function () {
      saved = true;
      return this;
    }
  };

  Booking.findById = (id) => ({
    populate: () => Promise.resolve(fakeBooking),
    then(resolve) {
      resolve(fakeBooking);
    }
  });

  const res = createResponse();
  await updateBookingPassengerInfo(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: {
        fullName: 'Trần Thị B',
        phone: '0987654321',
        email: 'tranb@gmail.com',
        address: '123 Đường Mới',
        note: 'Dị ứng hải sản'
      },
      user: { _id: '507f1f77bcf86cd799439001' }
    },
    res.response
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(saved, true);
  assert.equal(fakeBooking.fullName, 'Trần Thị B');
  assert.equal(fakeBooking.phone, '0987654321');
  assert.equal(fakeBooking.email, 'tranb@gmail.com');
  assert.equal(fakeBooking.address, '123 Đường Mới');
  assert.equal(fakeBooking.note, 'Dị ứng hải sản');
  assert.equal(fakeBooking.passengerUpdateCount, 1);
});

