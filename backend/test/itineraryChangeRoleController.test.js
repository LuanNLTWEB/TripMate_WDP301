import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import { changeCollaboratorRole } from '../src/controllers/invitationController.js';

const originalFindOneAndUpdate = Itinerary.findOneAndUpdate;
const originalFindById = Itinerary.findById;
const originalConsoleError = console.error;

const ITINERARY_ID = '507f1f77bcf86cd799439011';
const OWNER_ID = '507f1f77bcf86cd799439001';
const COLLABORATOR_ID = '507f1f77bcf86cd799439002';

afterEach(() => {
  Itinerary.findOneAndUpdate = originalFindOneAndUpdate;
  Itinerary.findById = originalFindById;
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

const buildRequest = (permission = 'edit', userId = COLLABORATOR_ID) => ({
  params: { id: ITINERARY_ID, userId },
  body: { permission },
  user: { _id: OWNER_ID }
});

const stubFindById = (doc) => {
  Itinerary.findById = () => ({
    select: () => doc
  });
};

const createCollaborator = (permission = 'view') => ({
  _id: '507f1f77bcf86cd799439021',
  user: COLLABORATOR_ID,
  permission
});

test('UC-135 - owner changes collaborator role with one atomic update', async () => {
  let filterArg = null;
  let updateArg = null;

  Itinerary.findOneAndUpdate = async (filter, update) => {
    filterArg = filter;
    updateArg = update;
    return { collaborators: [createCollaborator('view')] };
  };
  Itinerary.findById = () => {
    throw new Error('findById should not be called on the happy path');
  };

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.collaborator.permission, 'edit');
  assert.match(res.body.message, /Đã đổi quyền cộng tác viên thành chỉnh sửa/);
  assert.equal(filterArg._id, ITINERARY_ID);
  assert.equal(filterArg.owner, OWNER_ID);
  assert.deepEqual(updateArg, { $set: { 'collaborators.$.permission': 'edit' } });
});

test('UC-135 - keeps the "already has role" message without writing', async () => {
  let saveCalled = false;

  Itinerary.findOneAndUpdate = async () => null;
  stubFindById({
    owner: OWNER_ID,
    collaborators: [createCollaborator('edit')],
    save: async () => {
      saveCalled = true;
    }
  });

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /đã là "chỉnh sửa"/);
  assert.equal(saveCalled, false);
});

test('UC-135 - falls back to save when the targeted update matches nothing', async () => {
  const collaborator = createCollaborator('view');
  let saveCalled = false;

  Itinerary.findOneAndUpdate = async () => null;
  stubFindById({
    owner: OWNER_ID,
    collaborators: [collaborator],
    save: async () => {
      saveCalled = true;
    }
  });

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(collaborator.permission, 'edit');
  assert.equal(saveCalled, true);
  assert.equal(res.body.collaborator.permission, 'edit');
});

test('UC-135 - returns 404 when the itinerary does not exist', async () => {
  Itinerary.findOneAndUpdate = async () => null;
  stubFindById(null);

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy lịch trình/);
});

test('UC-135 - rejects a user who is not the itinerary owner', async () => {
  Itinerary.findOneAndUpdate = async () => null;
  stubFindById({
    owner: '507f1f77bcf86cd799439099',
    collaborators: [createCollaborator('view')]
  });

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /không có quyền quản lý người tham gia/);
});

test('UC-135 - returns 404 when the collaborator is not in the itinerary', async () => {
  Itinerary.findOneAndUpdate = async () => null;
  stubFindById({
    owner: OWNER_ID,
    collaborators: []
  });

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy cộng tác viên/);
});

test('UC-135 - returns a safe error when the atomic update fails', async () => {
  Itinerary.findOneAndUpdate = async () => {
    throw new Error('db down');
  };
  console.error = () => {};

  const res = createResponse();
  await changeCollaboratorRole(buildRequest('edit'), res.response);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không thể đổi quyền cộng tác viên/);
});
