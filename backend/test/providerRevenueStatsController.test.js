import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import Booking from '../src/models/Booking.js';
import { getProviderRevenueStats } from '../src/controllers/statsController.js';

const originalTourFind = Tour.find;
const originalBookingFind = Booking.find;

afterEach(() => {
  Tour.find = originalTourFind;
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

test('getProviderRevenueStats returns zeroed metrics when provider has no tours', async () => {
  Tour.find = () => ({
    select() {
      return Promise.resolve([]);
    }
  });

  const res = createResponse();
  await getProviderRevenueStats(
    {
      user: { _id: 'provider-empty' },
      query: {}
    },
    res.response
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.summary.totalCollectedRevenue, 0);
  assert.equal(res.body.data.summary.totalCompletedBookings, 0);
  assert.equal(res.body.data.tours.length, 0);
});

test('getProviderRevenueStats returns 403 when querying tourId of another provider', async () => {
  Tour.find = () => ({
    select() {
      return Promise.resolve([
        { _id: 'tour-own-1', title: 'Tour của tôi' }
      ]);
    }
  });

  const res = createResponse();
  await getProviderRevenueStats(
    {
      user: { _id: 'provider-1' },
      query: { tourId: 'tour-stranger-99' }
    },
    res.response
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Bạn không có quyền xem thống kê của tour này/);
});

test('getProviderRevenueStats correctly aggregates revenue, booking counts, and passenger metrics', async () => {
  const mockTours = [
    { _id: 'tour-1', title: 'Tour Đà Nẵng 3N2Đ', price: 3000000 },
    { _id: 'tour-2', title: 'Tour Hội An 1N', price: 1000000 }
  ];

  Tour.find = () => ({
    select() {
      return Promise.resolve(mockTours);
    }
  });

  const mockBookings = [
    {
      _id: 'b-1',
      tourId: { _id: 'tour-1', title: 'Tour Đà Nẵng 3N2Đ' },
      customerId: { username: 'Customer A', email: 'a@test.com' },
      fullName: 'Nguyễn Văn A',
      numberOfPeople: 2,
      totalPrice: 6000000,
      status: 'completed',
      paidAt: new Date('2026-11-05T10:00:00Z'),
      paymentMethod: 'bank_transfer',
      createdAt: new Date('2026-11-01T10:00:00Z')
    },
    {
      _id: 'b-2',
      tourId: { _id: 'tour-1', title: 'Tour Đà Nẵng 3N2Đ' },
      customerId: { username: 'Customer B', email: 'b@test.com' },
      fullName: 'Trần Thị B',
      numberOfPeople: 1,
      totalPrice: 3000000,
      status: 'paid',
      paidAt: new Date('2026-11-06T10:00:00Z'),
      paymentMethod: 'cash',
      createdAt: new Date('2026-11-02T10:00:00Z')
    },
    {
      _id: 'b-3',
      tourId: { _id: 'tour-2', title: 'Tour Hội An 1N' },
      customerId: { username: 'Customer C', email: 'c@test.com' },
      fullName: 'Lê Văn C',
      numberOfPeople: 3,
      totalPrice: 3000000,
      status: 'confirmed',
      paidAt: null,
      paymentMethod: 'cash',
      createdAt: new Date('2026-11-07T10:00:00Z')
    },
    {
      _id: 'b-4',
      tourId: { _id: 'tour-2', title: 'Tour Hội An 1N' },
      customerId: { username: 'Customer D', email: 'd@test.com' },
      fullName: 'Phạm Thị D',
      numberOfPeople: 1,
      totalPrice: 1000000,
      status: 'cancelled',
      paidAt: null,
      paymentMethod: 'cash',
      createdAt: new Date('2026-11-04T10:00:00Z')
    }
  ];

  Booking.find = () => ({
    populate() {
      return {
        populate() {
          return {
            sort() {
              return Promise.resolve(mockBookings);
            }
          };
        }
      };
    }
  });

  const res = createResponse();
  await getProviderRevenueStats(
    {
      user: { _id: 'provider-1' },
      query: { timeRange: '30_days' }
    },
    res.response
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  const { summary, revenueByTour, recentTransactions } = res.body.data;

  // b-1 (6,000,000) + b-2 (3,000,000) = 9,000,000 collected
  assert.equal(summary.totalCollectedRevenue, 9000000);
  // b-3 (3,000,000) = 3,000,000 confirmed
  assert.equal(summary.totalConfirmedRevenue, 3000000);
  // b-4 (1,000,000) = 1,000,000 cancelled
  assert.equal(summary.totalCancelledRevenue, 1000000);
  assert.equal(summary.totalCompletedBookings, 2);
  assert.equal(summary.totalConfirmedBookings, 1);
  assert.equal(summary.totalCancelledBookings, 1);
  // b-1 (2) + b-2 (1) = 3 passengers
  assert.equal(summary.totalPassengersServed, 3);

  // Tour ranking
  assert.equal(revenueByTour.length, 2);
  assert.equal(revenueByTour[0].tourId, 'tour-1');
  assert.equal(revenueByTour[0].collectedRevenue, 9000000);

  // Recent transactions
  assert.equal(recentTransactions.length, 4);
});

test('getProviderRevenueStats returns 500 when database throws an error', async () => {
  Tour.find = () => {
    throw new Error('Database connection failed');
  };

  const res = createResponse();
  await getProviderRevenueStats(
    {
      user: { _id: 'provider-1' },
      query: {}
    },
    res.response
  );

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không thể tải thống kê doanh thu/);
});

