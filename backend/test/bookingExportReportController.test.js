import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import Booking from '../src/models/Booking.js';
import Tour from '../src/models/Tour.js';
import { exportProviderBookingReport } from '../src/controllers/bookingController.js';

const originalTourFind = Tour.find;
const originalBookingFind = Booking.find;

afterEach(() => {
  Tour.find = originalTourFind;
  Booking.find = originalBookingFind;
});

const createMockStreamResponse = () => {
  const stream = new PassThrough();
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));

  const output = {
    statusCode: 200,
    headers: {},
    body: null,
    getBuffer: () => Buffer.concat(chunks)
  };

  stream.status = function (code) {
    output.statusCode = code;
    return this;
  };
  stream.set = function (headers) {
    Object.assign(output.headers, headers);
    return this;
  };
  stream.json = function (body) {
    output.body = body;
    return this;
  };

  output.response = stream;
  return output;
};

test('UC-123: rejects export when from date has invalid format', async () => {
  const result = createMockStreamResponse();
  const req = {
    query: { from: '2026/11/01' },
    user: { _id: 'provider-1', username: 'TourGuide1' }
  };

  await exportProviderBookingReport(req, result.response);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'Ngày bắt đầu không hợp lệ');
});

test('UC-123: rejects export when to date has invalid format', async () => {
  const result = createMockStreamResponse();
  const req = {
    query: { to: 'invalid-date' },
    user: { _id: 'provider-1', username: 'TourGuide1' }
  };

  await exportProviderBookingReport(req, result.response);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'Ngày kết thúc không hợp lệ');
});

test('UC-123: rejects export when from date is after to date', async () => {
  const result = createMockStreamResponse();
  const req = {
    query: { from: '2026-11-10', to: '2026-11-05' },
    user: { _id: 'provider-1', username: 'TourGuide1' }
  };

  await exportProviderBookingReport(req, result.response);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'Ngày bắt đầu phải trước ngày kết thúc');
});

test('UC-123: exports valid Excel workbook with empty bookings', async () => {
  Tour.find = () => ({
    select: () => ({
      lean: async () => [{ _id: 'tour-1', title: 'Ha Long Tour' }]
    })
  });

  Booking.find = () => ({
    populate: () => ({
      sort: () => ({
        lean: async () => []
      })
    })
  });

  const result = createMockStreamResponse();
  const req = {
    query: {},
    user: { _id: 'provider-1', username: 'TourGuide1', businessName: 'TripMate Ha Long', email: 'provider@tripmate.vn' }
  };

  await exportProviderBookingReport(req, result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(
    result.headers['Content-Type'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  assert.match(result.headers['Content-Disposition'], /attachment; filename="tripmate-provider-booking-report-\d{4}-\d{2}-\d{2}\.xlsx"/);

  const buffer = result.getBuffer();
  assert.ok(buffer.length > 0, 'Buffer should not be empty');

  // Load buffer into ExcelJS to verify workbook structure
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet('Báo cáo đơn đặt tour');
  assert.ok(ws, 'Worksheet Báo cáo đơn đặt tour should exist');

  // Verify Brand & Title cells
  assert.equal(ws.getCell('B2').value, 'TRIPMATE TRAVEL - SLIM CRM');
  assert.equal(ws.getCell('A3').value, 'BÁO CÁO CHI TIẾT ĐƠN ĐẶT TOUR');
  assert.match(ws.getCell('A6').value, /Nhà cung cấp: TripMate Ha Long/);

  // Empty message at row 11
  assert.equal(ws.getCell('A11').value, 'Không có dữ liệu đơn đặt tour nào trong khoảng thời gian này');

  // Summary Row at row 12
  assert.equal(ws.getCell('A12').value, 'TỔNG CỘNG / TOTAL');
  assert.equal(ws.getCell('H12').value, 0); // Pax
  assert.equal(ws.getCell('I12').value, 0); // Total price
  assert.equal(ws.getCell('J12').value, '0 đơn đặt chỗ');
});

test('UC-123: exports valid Excel workbook with bookings, headers, and formatted totals', async () => {
  Tour.find = () => ({
    select: () => ({
      lean: async () => [{ _id: 'tour-1', title: 'Tour Du Lịch Phú Quốc' }]
    })
  });

  const mockBookings = [
    {
      _id: '672e1234567890abcdef0001',
      tourId: { title: 'Tour Du Lịch Phú Quốc' },
      fullName: 'Nguyễn Văn A',
      phone: '0912345678',
      email: 'nguyenvana@gmail.com',
      departureDate: new Date('2026-11-15T00:00:00Z'),
      numberOfPeople: 2,
      totalPrice: 5000000,
      status: 'paid',
      createdAt: new Date('2026-11-01T10:00:00Z'),
      note: 'Yêu cầu phòng tầng cao'
    },
    {
      _id: '672e1234567890abcdef0002',
      tourId: { title: 'Tour Du Lịch Phú Quốc' },
      fullName: 'Trần Thị B',
      phone: '0987654321',
      email: 'tranthib@gmail.com',
      departureDate: new Date('2026-11-20T00:00:00Z'),
      numberOfPeople: 4,
      totalPrice: 10000000,
      status: 'confirmed',
      createdAt: new Date('2026-11-02T14:30:00Z'),
      note: ''
    }
  ];

  Booking.find = (query) => {
    assert.deepEqual(query.tourId, { $in: ['tour-1'] });
    return {
      populate: () => ({
        sort: () => ({
          lean: async () => mockBookings
        })
      })
    };
  };

  const result = createMockStreamResponse();
  const req = {
    query: { from: '2026-11-01', to: '2026-11-05' },
    user: { _id: 'provider-1', username: 'tourguide', phone: '0901234567', email: 'guide@tripmate.com' }
  };

  await exportProviderBookingReport(req, result.response);

  assert.equal(result.statusCode, 200);
  const buffer = result.getBuffer();
  assert.ok(buffer.length > 0);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet('Báo cáo đơn đặt tour');

  // Verify headers at row 10
  const expectedHeaders = [
    'STT', 'Mã đơn', 'Tên tour', 'Họ và tên khách hàng',
    'Số điện thoại', 'Email', 'Ngày khởi hành', 'Số lượng vé',
    'Tổng tiền', 'Trạng thái', 'Ngày đặt', 'Ghi chú'
  ];
  expectedHeaders.forEach((h, idx) => {
    assert.equal(ws.getCell(10, idx + 1).value, h);
  });

  // Verify first row data (Row 11)
  assert.equal(ws.getCell('A11').value, 1);
  assert.equal(ws.getCell('B11').value, 'BK-EF0001');
  assert.equal(ws.getCell('C11').value, 'Tour Du Lịch Phú Quốc');
  assert.equal(ws.getCell('D11').value, 'Nguyễn Văn A');
  assert.equal(ws.getCell('E11').value, '0912345678');
  assert.equal(ws.getCell('F11').value, 'nguyenvana@gmail.com');
  assert.equal(ws.getCell('H11').value, 2);
  assert.equal(ws.getCell('I11').value, 5000000);
  assert.equal(ws.getCell('J11').value, 'Đã thanh toán');

  // Verify second row data (Row 12)
  assert.equal(ws.getCell('A12').value, 2);
  assert.equal(ws.getCell('B12').value, 'BK-EF0002');
  assert.equal(ws.getCell('D12').value, 'Trần Thị B');
  assert.equal(ws.getCell('H12').value, 4);
  assert.equal(ws.getCell('I12').value, 10000000);
  assert.equal(ws.getCell('J12').value, 'Đã xác nhận');

  // Total summary row at Row 13 (11 + 2)
  assert.equal(ws.getCell('A13').value, 'TỔNG CỘNG / TOTAL');
  assert.equal(ws.getCell('H13').value, 6); // 2 + 4 guests
  assert.equal(ws.getCell('I13').value, 15000000); // 5M + 10M
  assert.equal(ws.getCell('J13').value, '2 đơn đặt chỗ');
});
