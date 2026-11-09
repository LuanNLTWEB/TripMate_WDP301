import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import { updatePackingItemStatus } from '../src/controllers/itineraryController.js';

const originalFindById = Itinerary.findById;
const originalConsoleError = console.error;

const ITINERARY_ID = '507f1f77bcf86cd799439011';
const ITEM_ID = '507f1f77bcf86cd799439021';
const OWNER_ID = '507f1f77bcf86cd799439001';
const EDITOR_ID = '507f1f77bcf86cd799439002';
const VIEWER_ID = '507f1f77bcf86cd799439003';

afterEach(() => {
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

const createFakeItinerary = ({ isPacked = false, packedBy = [], collaborators = [], save } = {}) => {
  const item = { _id: ITEM_ID, name: 'Quần áo', isPacked, packedBy: [...packedBy] };
  const itinerary = {
    _id: ITINERARY_ID,
    owner: OWNER_ID,
    collaborators,
    activities: [],
    packingItems: Object.assign([item], {
      id: (id) => (String(id) === String(item._id) ? item : null)
    }),
    save: save || (async function () { return this; }),
    toObject() { return this; }
  };

  return { itinerary, item };
};

const stubFindById = (fakeItinerary) => {
  Itinerary.findById = () => ({
    populate: () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            populate: () => Promise.resolve(fakeItinerary)
          })
        })
      })
    }),
    then(resolve) {
      resolve(fakeItinerary);
    }
  });
};

const buildRequest = (status, userId = OWNER_ID, itemId = ITEM_ID) => ({
  params: { id: ITINERARY_ID, itemId },
  body: { status },
  user: { _id: userId }
});

test('UC-151 - owner marks a packing item as packed', async () => {
  const { itinerary, item } = createFakeItinerary();
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('completed'), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(item.isPacked, true);
  assert.deepEqual(item.packedBy.map(String), [OWNER_ID]);
  assert.equal(res.body.packingItem.isPacked, true);
  assert.equal(res.body.packingItem.packedCount, 1);
  assert.equal(res.body.packingItem.status, 'completed');
  assert.equal(res.body.packingItem._id, ITEM_ID);
  assert.equal(res.body.packingItem.name, 'Quần áo');
  assert.match(res.body.message, /Đã đánh dấu vật dụng đã chuẩn bị/);
});

test('UC-151 - owner unmarks a packed item', async () => {
  const { itinerary, item } = createFakeItinerary({ isPacked: true, packedBy: [OWNER_ID] });
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('incomplete'), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(item.isPacked, false);
  assert.deepEqual(item.packedBy.map(String), []);
  assert.equal(res.body.packingItem.isPacked, false);
  assert.equal(res.body.packingItem.status, 'incomplete');
  assert.match(res.body.message, /Đã bỏ đánh dấu vật dụng/);
});

test('UC-151 - editor collaborator can update packing status', async () => {
  const { itinerary, item } = createFakeItinerary({
    collaborators: [{ user: EDITOR_ID, permission: 'edit' }]
  });
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('completed', EDITOR_ID), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(item.isPacked, true);
  assert.deepEqual(item.packedBy.map(String), [EDITOR_ID]);
  assert.equal(res.body.packingItem.isPacked, true);
});

test('UC-151 - viewer collaborator can mark the item for themselves', async () => {
  const { itinerary, item } = createFakeItinerary({
    collaborators: [{ user: VIEWER_ID, permission: 'view' }]
  });
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('completed', VIEWER_ID), res.response);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(item.isPacked, true);
  assert.deepEqual(item.packedBy.map(String), [VIEWER_ID]);
  assert.equal(res.body.packingItem.isPacked, true);
});

test('UC-151 - packed state is independent for each member', async () => {
  const { itinerary, item } = createFakeItinerary({
    collaborators: [
      { user: EDITOR_ID, permission: 'edit' },
      { user: VIEWER_ID, permission: 'view' }
    ]
  });
  stubFindById(itinerary);

  // Owner tick
  const ownerRes = createResponse();
  await updatePackingItemStatus(buildRequest('completed', OWNER_ID), ownerRes.response);
  assert.equal(ownerRes.body.packingItem.isPacked, true);
  assert.deepEqual(item.packedBy.map(String), [OWNER_ID]);

  // Viewer chưa tick thì gọi bỏ tick cũng không ảnh hưởng owner
  const viewerRes = createResponse();
  await updatePackingItemStatus(buildRequest('incomplete', VIEWER_ID), viewerRes.response);
  assert.equal(viewerRes.body.packingItem.isPacked, false);
  assert.deepEqual(item.packedBy.map(String), [OWNER_ID]);

  // Editor tick độc lập
  const editorRes = createResponse();
  await updatePackingItemStatus(buildRequest('completed', EDITOR_ID), editorRes.response);
  assert.equal(editorRes.body.packingItem.isPacked, true);
  assert.deepEqual(item.packedBy.map(String).sort(), [OWNER_ID, EDITOR_ID].sort());

  // Owner bỏ tick chỉ ảnh hưởng owner
  const ownerUnmarkRes = createResponse();
  await updatePackingItemStatus(buildRequest('incomplete', OWNER_ID), ownerUnmarkRes.response);
  assert.equal(ownerUnmarkRes.body.packingItem.isPacked, false);
  assert.deepEqual(item.packedBy.map(String), [EDITOR_ID]);
});

test('UC-151 - unrelated user cannot update another itinerary checklist', async () => {
  const { itinerary, item } = createFakeItinerary();
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('completed', '507f1f77bcf86cd799439099'), res.response);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.equal(item.isPacked, false);
});

test('UC-151 - returns 404 when itinerary does not exist', async () => {
  Itinerary.findById = () => Promise.resolve(null);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('completed'), res.response);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy lịch trình/);
});

test('UC-151 - returns 404 when packing item does not belong to itinerary', async () => {
  const { itinerary } = createFakeItinerary();
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(
    buildRequest('completed', OWNER_ID, '507f1f77bcf86cd799439099'),
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy vật dụng/);
});

test('UC-151 - rejects invalid status value', async () => {
  const res = createResponse();
  await updatePackingItemStatus(buildRequest('something-else'), res.response);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Trạng thái vật dụng không hợp lệ/);
});

test('UC-151 - returns safe error when database save fails', async () => {
  console.error = () => {};
  const { itinerary } = createFakeItinerary({
    save: async () => {
      throw new Error('MongoDB write failed');
    }
  });
  stubFindById(itinerary);

  const res = createResponse();
  await updatePackingItemStatus(buildRequest('completed'), res.response);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không thể cập nhật trạng thái vật dụng/);
  assert.equal(res.body.message.includes('MongoDB'), false);
});
