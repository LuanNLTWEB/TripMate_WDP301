import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Announcement from '../src/models/Announcement.js';
import {
  getAnnouncements,
  getManagedAnnouncements
} from '../src/controllers/announcementController.js';

// START UC-83 Search & Filter Platform Announcements
const originalCountDocuments = Announcement.countDocuments;
const originalFind = Announcement.find;

afterEach(() => {
  Announcement.countDocuments = originalCountDocuments;
  Announcement.find = originalFind;
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

const createFindChain = (records, capture = {}) => ({
  populate() {
    return this;
  },
  sort(val) {
    capture.sort = val;
    return this;
  },
  skip(val) {
    capture.skip = val;
    return this;
  },
  limit(val) {
    capture.limit = val;
    return Promise.resolve(records);
  }
});

test('UC-83: getAnnouncements searches announcements by title and content safely with regex escape', async () => {
  let capturedFilter;
  const capture = {};
  Announcement.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 1;
  };
  Announcement.find = (filter) => {
    capturedFilter = filter;
    return createFindChain([{ _id: 'announcement-1', title: 'Khuyến mãi hè [2026]?' }], capture);
  };

  const res = createResponse();
  await getAnnouncements({
    user: { role: 'customer' },
    query: { search: '[2026]?', page: 1, limit: 10 }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter.isActive, true);
  assert.ok(capturedFilter.$or);
  assert.equal(capturedFilter.$or.length, 2);
  // Must match '[2026]?' with escaped brackets
  assert.equal(capturedFilter.$or[0].title.test('Khuyến mãi hè [2026]?'), true);
  assert.equal(capturedFilter.$or[0].title.test('Khuyến mãi hè 2026'), false);
});

test('UC-83: getAnnouncements filters by audience within user role scope', async () => {
  let capturedFilter;
  Announcement.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 2;
  };
  Announcement.find = () => createFindChain([
    { _id: 'announcement-c1', audience: 'customer' },
    { _id: 'announcement-c2', audience: 'customer' }
  ]);

  const res = createResponse();
  await getAnnouncements({
    user: { role: 'customer' },
    query: { audience: 'customer', page: 1, limit: 10 }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter.isActive, true);
  assert.equal(capturedFilter.audience, 'customer');
});

test('UC-83: getManagedAnnouncements filters by status and audience for staff', async () => {
  let capturedFilter;
  const capture = {};
  Announcement.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 10;
  };
  Announcement.find = () => createFindChain([
    { _id: 'draft-1', isActive: false, audience: 'tourProvider' }
  ], capture);

  const res = createResponse();
  await getManagedAnnouncements({
    user: { role: 'staff' },
    query: { status: 'draft', audience: 'tourProvider', page: 2, limit: 5 }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter.isActive, false);
  assert.equal(capturedFilter.audience, 'tourProvider');
  assert.equal(capture.skip, 5); // (page 2 - 1) * limit 5
  assert.equal(capture.limit, 5);
  assert.equal(res.body.totalPages, 2);
});

test('UC-83: getManagedAnnouncements filters active announcements with search', async () => {
  let capturedFilter;
  Announcement.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 1;
  };
  Announcement.find = () => createFindChain([
    { _id: 'active-1', title: 'Thông báo điều khoản mới', isActive: true }
  ]);

  const res = createResponse();
  await getManagedAnnouncements({
    user: { role: 'staff' },
    query: { status: 'active', search: 'điều khoản' }
  }, res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter.isActive, true);
  assert.ok(capturedFilter.$or[0].title.test('Thông báo điều khoản mới'));
});
// END UC-83 Search & Filter Platform Announcements
