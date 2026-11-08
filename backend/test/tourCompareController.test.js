import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Tour from '../src/models/Tour.js';
import Departure from '../src/models/Departure.js';
import Review from '../src/models/Review.js';
import { compareTours } from '../src/controllers/tourController.js';

const originalTourFind = Tour.find;
const originalDepartureFind = Departure.find;
const originalReviewAggregate = Review.aggregate;

afterEach(() => {
  Tour.find = originalTourFind;
  Departure.find = originalDepartureFind;
  Review.aggregate = originalReviewAggregate;
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

test('compareTours returns 400 when duplicate IDs result in fewer than 2 unique tours', async () => {
  const res = createResponse();
  await compareTours(
    {
      body: { tourIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'] }
    },
    res.response
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Vui lòng chọn ít nhất 2 tour khác nhau/);
});

test('compareTours returns 400 when more than 4 tourIds are provided', async () => {
  const res = createResponse();
  await compareTours(
    {
      body: {
        tourIds: [
          '507f1f77bcf86cd799439011',
          '507f1f77bcf86cd799439012',
          '507f1f77bcf86cd799439013',
          '507f1f77bcf86cd799439014',
          '507f1f77bcf86cd799439015'
        ]
      }
    },
    res.response
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Chỉ có thể so sánh tối đa 4 tour/);
});

test('compareTours returns 404 when fewer than 2 active tours match database query', async () => {
  Tour.find = () => ({
    populate() {
      return {
        populate() {
          return Promise.resolve([
            {
              _id: '507f1f77bcf86cd799439011',
              title: 'Tour 1 Active',
              status: 'active',
              isDeleted: false
            }
          ]);
        }
      };
    }
  });

  const res = createResponse();
  await compareTours(
    {
      body: { tourIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] }
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy đủ ít nhất 2 tour đang hoạt động/);
});

test('compareTours returns 200 with structured side-by-side data for active tours', async () => {
  const mockTours = [
    {
      _id: '507f1f77bcf86cd799439011',
      title: 'Khám phá Đà Nẵng 3N2Đ',
      description: 'Tour tham quan Bà Nà Hills và Ngũ Hành Sơn',
      location: 'Đà Nẵng',
      departureLocation: 'Hà Nội',
      destinationLocation: 'Đà Nẵng',
      price: 3500000,
      duration: '3 ngày 2 đêm',
      images: ['https://example.com/img1.jpg'],
      availableSeats: 20,
      includedServices: ['Xe đưa đón', 'Khách sạn 4 sao', 'Ăn sáng'],
      excludedServices: ['Chi phí cá nhân', 'Vé máy bay'],
      cancellationPolicy: 'Miễn phí hủy trước 72h',
      notes: 'Mang theo CMND/CCCD',
      averageRating: 4.8,
      categoryId: { _id: 'cat-1', name: 'Du lịch nghỉ dưỡng' },
      providerId: { _id: 'prov-1', username: 'danangtour', businessName: 'Da Nang Travel' },
      itinerary: [
        { day: 1, title: 'Đến Đà Nẵng', description: 'Nhận phòng và nghỉ ngơi', isDeleted: false },
        { day: 2, title: 'Bà Nà Hills', description: 'Cầu Vàng và Làng Pháp', isDeleted: false }
      ]
    },
    {
      _id: '507f1f77bcf86cd799439012',
      title: 'Hành trình Di sản Huế 2N1Đ',
      description: 'Tham quan Đại Nội Huế và lăng tẩm các vua triều Nguyễn',
      location: 'Huế',
      departureLocation: 'Đà Nẵng',
      destinationLocation: 'Huế',
      price: 1800000,
      duration: '2 ngày 1 đêm',
      images: ['https://example.com/img2.jpg'],
      availableSeats: 15,
      includedServices: ['Vé tham quan Đại Nội', 'Bữa trưa đặc sản Huế'],
      excludedServices: ['Nước uống ngoài menu'],
      cancellationPolicy: 'Hủy trước 48h hoàn 80%',
      notes: 'Trang phục lịch sự khi vào Đại Nội',
      averageRating: 4.5,
      categoryId: { _id: 'cat-2', name: 'Du lịch văn hóa' },
      providerId: { _id: 'prov-2', username: 'huetour', businessName: 'Cố Đô Travel' },
      itinerary: [
        { day: 1, title: 'Đại Nội Huế', description: 'Tham quan Ngọ Môn và Điện Thái Hòa', isDeleted: false }
      ]
    }
  ];

  Tour.find = () => ({
    populate() {
      return {
        populate() {
          return Promise.resolve(mockTours);
        }
      };
    }
  });

  Departure.find = () => ({
    sort() {
      return Promise.resolve([
        {
          _id: 'dep-1',
          tourId: '507f1f77bcf86cd799439011',
          departureDate: new Date('2026-11-20'),
          availableSeats: 10,
          price: 3500000
        }
      ]);
    }
  });

  Review.aggregate = () => Promise.resolve([
    { _id: '507f1f77bcf86cd799439011', count: 12 },
    { _id: '507f1f77bcf86cd799439012', count: 8 }
  ]);

  const res = createResponse();
  await compareTours(
    {
      body: { tourIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] }
    },
    res.response
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.data[0].title, 'Khám phá Đà Nẵng 3N2Đ');
  assert.equal(res.body.data[0].price, 3500000);
  assert.equal(res.body.data[0].reviewCount, 12);
  assert.equal(res.body.data[0].upcomingDepartures.length, 1);
  assert.equal(res.body.data[1].title, 'Hành trình Di sản Huế 2N1Đ');
  assert.equal(res.body.data[1].reviewCount, 8);
});

test('compareTours returns 500 when database throws an error', async () => {
  Tour.find = () => {
    throw new Error('Database query timeout');
  };

  const res = createResponse();
  await compareTours(
    {
      body: { tourIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] }
    },
    res.response
  );

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không thể so sánh tour/);
});

