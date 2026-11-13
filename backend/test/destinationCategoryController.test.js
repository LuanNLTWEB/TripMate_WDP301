import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import DestinationCategory from '../src/models/DestinationCategory.js';
import ActivityLog from '../src/models/ActivityLog.js';
import {
  createCategory,
  updateCategory,
  deleteCategory
} from '../src/controllers/destinationCategoryController.js';
import Destination from '../src/models/Destination.js';

const originalFindOne = DestinationCategory.findOne;
const originalFindById = DestinationCategory.findById;
const originalCreate = DestinationCategory.create;
const originalCountDocuments = Destination.countDocuments;
const originalActivityLogCreate = ActivityLog.create;
const originalConsoleError = console.error;

afterEach(() => {
  DestinationCategory.findOne = originalFindOne;
  DestinationCategory.findById = originalFindById;
  DestinationCategory.create = originalCreate;
  Destination.countDocuments = originalCountDocuments;
  ActivityLog.create = originalActivityLogCreate;
  console.error = originalConsoleError;
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

const STAFF = {
  _id: '507f1f77bcf86cd799439001',
  username: 'staff1',
  email: 'staff@example.com'
};
const CATEGORY_ID = '507f1f77bcf86cd799439011';

const buildCreateRequest = (name, description = '') => ({
  body: { name, description },
  user: STAFF,
  headers: {},
  socket: { remoteAddress: '127.0.0.1' }
});

const buildUpdateRequest = (name, description = '') => ({
  params: { id: CATEGORY_ID },
  body: { name, description },
  user: STAFF,
  headers: {},
  socket: { remoteAddress: '127.0.0.1' }
});

const buildDeleteRequest = () => ({
  params: { id: CATEGORY_ID },
  user: STAFF,
  headers: {},
  socket: { remoteAddress: '127.0.0.1' }
});

const createFakeCategory = () => ({
  _id: CATEGORY_ID,
  name: 'Danh mục cũ',
  description: 'Mô tả cũ',
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  saveCalls: 0,
  async save() {
    this.saveCalls += 1;
    return this;
  }
});

const createDuplicateKeyError = () => Object.assign(
  new Error('E11000 duplicate key error collection: tripmate.destinationcategories'),
  { code: 11000 }
);

// START UC-116 Create Destination Category
test('UC-116 - rejects a duplicate name ignoring case and surrounding spaces', async () => {
  let capturedQuery;
  let createCalled = false;

  DestinationCategory.findOne = async (query) => {
    capturedQuery = query;
    return { _id: 'existing', name: 'Biển' };
  };
  DestinationCategory.create = async () => {
    createCalled = true;
    return {};
  };

  const result = createResponse();
  await createCategory(buildCreateRequest('  BIỂN  '), result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Danh mục đã tồn tại');
  assert.equal(createCalled, false);
  assert.equal(capturedQuery.name instanceof RegExp, true);
  assert.equal(capturedQuery.name.flags.includes('i'), true);
  assert.equal(capturedQuery.name.test('biển'), true);
  assert.equal(capturedQuery.name.test('Biển Đông'), false);
});

test('UC-116 - creates a category with a trimmed name and writes an activity log', async () => {
  let createPayload;
  let logPayload;

  DestinationCategory.findOne = async () => null;
  DestinationCategory.create = async (payload) => {
    createPayload = payload;
    return { _id: CATEGORY_ID, ...payload };
  };
  ActivityLog.create = async (payload) => {
    logPayload = payload;
    return payload;
  };

  const result = createResponse();
  await createCategory(buildCreateRequest('  Biển xanh  ', 'Mô tả danh mục'), result.response);

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.equal(result.body.data.name, 'Biển xanh');
  assert.equal(createPayload.name, 'Biển xanh');
  assert.equal(createPayload.description, 'Mô tả danh mục');
  assert.equal(logPayload.adminId, STAFF._id);
  assert.equal(logPayload.action, 'CREATE_DESTINATION_CATEGORY');
  assert.equal(logPayload.targetType, 'DestinationCategory');
  assert.equal(logPayload.targetId, CATEGORY_ID);
  assert.match(logPayload.details, /Biển xanh/);
});

test('UC-116 - returns 400 instead of 500 when two concurrent creates hit the unique index', async () => {
  console.error = () => {};
  DestinationCategory.findOne = async () => null;
  DestinationCategory.create = async () => {
    throw createDuplicateKeyError();
  };

  const result = createResponse();
  await createCategory(buildCreateRequest('Biển'), result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Danh mục đã tồn tại');
});
// END UC-116 Create Destination Category

// START UC-117 Update Destination Category
test('UC-117 - rejects renaming to a duplicate name ignoring case and surrounding spaces', async () => {
  const category = createFakeCategory();
  let capturedQuery;

  DestinationCategory.findById = async () => category;
  DestinationCategory.findOne = async (query) => {
    capturedQuery = query;
    return { _id: 'another-category', name: 'Biển' };
  };

  const result = createResponse();
  await updateCategory(buildUpdateRequest('  biển  '), result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Tên danh mục đã tồn tại');
  assert.equal(category.saveCalls, 0);
  assert.equal(capturedQuery._id.$ne, CATEGORY_ID);
  assert.equal(capturedQuery.name instanceof RegExp, true);
  assert.equal(capturedQuery.name.flags.includes('i'), true);
  assert.equal(capturedQuery.name.test('BIỂN'), true);
});

test('UC-117 - updates a category with a trimmed name and writes an activity log', async () => {
  const category = createFakeCategory();
  let logPayload;

  DestinationCategory.findById = async () => category;
  DestinationCategory.findOne = async () => null;
  ActivityLog.create = async (payload) => {
    logPayload = payload;
    return payload;
  };

  const result = createResponse();
  await updateCategory(buildUpdateRequest(' Biển mới ', 'Mô tả mới'), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(category.saveCalls, 1);
  assert.equal(category.name, 'Biển mới');
  assert.equal(category.description, 'Mô tả mới');
  assert.equal(logPayload.action, 'UPDATE_DESTINATION_CATEGORY');
  assert.equal(logPayload.targetType, 'DestinationCategory');
  assert.equal(logPayload.targetId, CATEGORY_ID);
  assert.match(logPayload.details, /Biển mới/);
});

test('UC-117 - returns 400 instead of 500 when the unique index rejects the new name', async () => {
  console.error = () => {};
  const category = createFakeCategory();
  category.save = async () => {
    throw createDuplicateKeyError();
  };

  DestinationCategory.findById = async () => category;
  DestinationCategory.findOne = async () => null;

  const result = createResponse();
  await updateCategory(buildUpdateRequest('Biển'), result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Tên danh mục đã tồn tại');
});

test('UC-117 - keeps the 404 response when the category does not exist', async () => {
  DestinationCategory.findById = async () => null;

  const result = createResponse();
  await updateCategory(buildUpdateRequest('Biển'), result.response);

  assert.equal(result.statusCode, 404);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Không tìm thấy danh mục');
});
// END UC-117 Update Destination Category

// START UC-119 Delete Destination Category
test('UC-119 - soft-deletes an unused category and writes an activity log', async () => {
  const category = createFakeCategory();
  let logPayload;

  DestinationCategory.findOne = async () => category;
  Destination.countDocuments = async () => 0;
  ActivityLog.create = async (payload) => {
    logPayload = payload;
    return payload;
  };

  const result = createResponse();
  await deleteCategory(buildDeleteRequest(), result.response);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(category.isDeleted, true);
  assert.equal(category.deletedBy, STAFF._id);
  assert.ok(category.deletedAt instanceof Date);
  assert.equal(category.saveCalls, 1);
  assert.equal(logPayload.action, 'DELETE_DESTINATION_CATEGORY');
  assert.equal(logPayload.targetType, 'DestinationCategory');
  assert.equal(logPayload.targetId, CATEGORY_ID);
  assert.match(logPayload.details, /Danh mục cũ/);
});

test('UC-119 - refuses deletion when a soft-deleted destination still references the category', async () => {
  const category = createFakeCategory();
  let countQuery;

  DestinationCategory.findOne = async () => category;
  Destination.countDocuments = async (query) => {
    countQuery = query;
    return 2;
  };

  const result = createResponse();
  await deleteCategory(buildDeleteRequest(), result.response);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.match(result.body.message, /2 điểm đến/);
  assert.equal(category.saveCalls, 0);
  assert.deepEqual(countQuery, { categoryId: CATEGORY_ID });
});
// END UC-119 Delete Destination Category
