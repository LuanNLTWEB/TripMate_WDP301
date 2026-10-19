import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Announcement from '../src/models/Announcement.js';
import {
  createAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  getManagedAnnouncements
} from '../src/controllers/announcementController.js';

const originalCreate = Announcement.create;
const originalCountDocuments = Announcement.countDocuments;
const originalFind = Announcement.find;
const originalFindOne = Announcement.findOne;

afterEach(() => {
  Announcement.create = originalCreate;
  Announcement.countDocuments = originalCountDocuments;
  Announcement.find = originalFind;
  Announcement.findOne = originalFindOne;
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

const createFindChain = (records, capture) => ({
  populate(path, fields) {
    capture.populate.push({ path, fields });
    return this;
  },
  sort(value) {
    capture.sort = value;
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

const createFindOneChain = (record, capture) => ({
  populate(path, fields) {
    capture.populate.push({ path, fields });
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve(record).then(resolve, reject);
  }
});

test('staff creates an announcement with normalized content and audit fields', async () => {
  let createdPayload;
  let populatedPaths;
  const createdAnnouncement = {
    _id: 'announcement-created',
    isActive: true,
    async populate(paths) {
      populatedPaths = paths;
      return this;
    }
  };
  Announcement.create = async (payload) => {
    createdPayload = payload;
    return createdAnnouncement;
  };

  const result = createResponse();
  await createAnnouncement({
    body: {
      title: '  Thông báo bảo trì  ',
      content: '  Hệ thống sẽ bảo trì lúc 23:00.  ',
      audience: 'customer',
      isActive: true
    },
    user: { _id: 'staff-1', role: 'staff' }
  }, result.response);

  assert.deepEqual(createdPayload, {
    title: 'Thông báo bảo trì',
    content: 'Hệ thống sẽ bảo trì lúc 23:00.',
    audience: 'customer',
    isActive: true,
    createdBy: 'staff-1',
    updatedBy: 'staff-1'
  });
  assert.deepEqual(populatedPaths, [
    { path: 'createdBy', select: 'username' },
    { path: 'updatedBy', select: 'username' }
  ]);
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data, createdAnnouncement);
});

test('customer only receives active announcements for all users or customers', async () => {
  let countFilter;
  let findFilter;
  const capture = { populate: [] };
  Announcement.countDocuments = async (filter) => {
    countFilter = filter;
    return 1;
  };
  Announcement.find = (filter) => {
    findFilter = filter;
    return createFindChain([{ _id: 'announcement-1' }], capture);
  };

  const result = createResponse();
  await getAnnouncements({
    user: { role: 'customer' },
    query: { search: 'Bảo trì (khẩn)', page: 8, limit: 10 }
  }, result.response);

  assert.equal(countFilter.isActive, true);
  assert.deepEqual(countFilter.audience, { $in: ['all', 'customer'] });
  assert.equal(countFilter.$or[0].title.test('Bảo trì (khẩn)'), true);
  assert.equal(countFilter.$or[0].title.test('Bảo trì khẩn'), false);
  assert.deepEqual(findFilter, countFilter);
  assert.equal(capture.skip, 0);
  assert.equal(capture.limit, 10);
  assert.deepEqual(capture.sort, { createdAt: -1 });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.currentPage, 1);
});

test('provider receives the provider audience while staff can view every active audience', async () => {
  const filters = [];
  Announcement.countDocuments = async (filter) => {
    filters.push(filter);
    return 0;
  };
  Announcement.find = () => createFindChain([], { populate: [] });

  const providerResult = createResponse();
  await getAnnouncements({ user: { role: 'tourProvider' }, query: {} }, providerResult.response);

  const staffResult = createResponse();
  await getAnnouncements({ user: { role: 'staff' }, query: {} }, staffResult.response);

  assert.deepEqual(filters[0], { isActive: true, audience: { $in: ['all', 'tourProvider'] } });
  assert.deepEqual(filters[1], { isActive: true });
  assert.equal(providerResult.statusCode, 200);
  assert.equal(staffResult.statusCode, 200);
});

test('management list applies draft and audience filters with pagination', async () => {
  let capturedFilter;
  const capture = { populate: [] };
  Announcement.countDocuments = async (filter) => {
    capturedFilter = filter;
    return 21;
  };
  Announcement.find = () => createFindChain([{ _id: 'draft-1' }], capture);

  const result = createResponse();
  await getManagedAnnouncements({
    user: { role: 'staff' },
    query: { status: 'draft', audience: 'customer', page: 3, limit: 10 }
  }, result.response);

  assert.deepEqual(capturedFilter, { isActive: false, audience: 'customer' });
  assert.equal(capture.skip, 20);
  assert.equal(result.body.total, 21);
  assert.equal(result.body.totalPages, 3);
  assert.equal(result.body.currentPage, 3);
});

test('announcement detail enforces provider audience visibility', async () => {
  let capturedFilter;
  const capture = { populate: [] };
  Announcement.findOne = (filter) => {
    capturedFilter = filter;
    return createFindOneChain({ _id: 'announcement-1', audience: 'tourProvider' }, capture);
  };

  const result = createResponse();
  await getAnnouncementById({
    params: { id: 'announcement-1' },
    user: { role: 'tourProvider' }
  }, result.response);

  assert.deepEqual(capturedFilter, {
    _id: 'announcement-1',
    isActive: true,
    audience: { $in: ['all', 'tourProvider'] }
  });
  assert.equal(capture.populate.length, 2);
  assert.equal(result.statusCode, 200);
});

test('returns not found when an announcement is outside the visible scope', async () => {
  Announcement.findOne = () => createFindOneChain(null, { populate: [] });

  const result = createResponse();
  await getAnnouncementById({
    params: { id: 'announcement-2' },
    user: { role: 'customer' }
  }, result.response);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.success, false);
});
