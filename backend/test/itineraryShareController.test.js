import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import { shareItinerary } from '../src/controllers/itineraryController.js';

const originalItineraryFindById = Itinerary.findById;
const originalUserFindOne = User.findOne;
const originalNotificationCreate = Notification.create;

afterEach(() => {
  Itinerary.findById = originalItineraryFindById;
  User.findOne = originalUserFindOne;
  Notification.create = originalNotificationCreate;
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

const makeMockItinerary = ({
  id = 'itin-123',
  title = 'Chuyến du lịch Đà Nẵng',
  ownerId = 'user-owner-1',
  collaborators = []
} = {}) => {
  const doc = {
    _id: id,
    title,
    owner: ownerId,
    collaborators: [...collaborators],
    saveCount: 0,
    async save() {
      this.saveCount += 1;
    },
    toObject() {
      return {
        _id: this._id,
        title: this.title,
        owner: this.owner,
        collaborators: this.collaborators
      };
    }
  };

  const queryMock = {
    ...doc,
    populate() {
      return queryMock;
    },
    then(resolve, reject) {
      return Promise.resolve(doc).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(doc).catch(reject);
    }
  };

  return { doc, queryMock };
};

test('shareItinerary returns 404 when itinerary is not found', async () => {
  Itinerary.findById = () => null;

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'non-existent-id' },
      user: { _id: 'user-owner-1' },
      body: { email: 'friend@test.com', permission: 'view' }
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy lịch trình/);
});

test('shareItinerary returns 403 when user is not the itinerary owner', async () => {
  const { doc } = makeMockItinerary({ ownerId: 'user-owner-1' });
  Itinerary.findById = () => doc;

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'itin-123' },
      user: { _id: 'user-intruder' },
      body: { email: 'friend@test.com', permission: 'view' }
    },
    res.response
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Bạn không có quyền chia sẻ lịch trình này/);
});

test('shareItinerary returns 404 when recipient email is not found in database', async () => {
  const { doc } = makeMockItinerary({ ownerId: 'user-owner-1' });
  Itinerary.findById = () => doc;
  User.findOne = () => null;

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'itin-123' },
      user: { _id: 'user-owner-1' },
      body: { email: 'unknown@test.com', permission: 'view' }
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không tìm thấy người dùng với email này/);
});

test('shareItinerary returns 400 when owner attempts to share with themselves', async () => {
  const { doc } = makeMockItinerary({ ownerId: 'user-owner-1' });
  Itinerary.findById = () => doc;
  User.findOne = () => ({
    _id: 'user-owner-1',
    email: 'owner@test.com',
    username: 'OwnerUser'
  });

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'itin-123' },
      user: { _id: 'user-owner-1' },
      body: { email: 'owner@test.com', permission: 'view' }
    },
    res.response
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không thể tự chia sẻ lịch trình cho chính mình/);
});

test('shareItinerary successfully adds new collaborator with view permission and sends notification', async () => {
  const { doc, queryMock } = makeMockItinerary({ ownerId: 'user-owner-1', collaborators: [] });
  Itinerary.findById = () => queryMock;
  User.findOne = () => ({
    _id: 'user-friend-2',
    email: 'friend@test.com',
    username: 'FriendUser'
  });

  let dispatchedNotification = null;
  Notification.create = async (payload) => {
    dispatchedNotification = payload;
    return payload;
  };

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'itin-123' },
      user: { _id: 'user-owner-1', username: 'PhucOwner', email: 'owner@test.com' },
      body: { email: 'friend@test.com', permission: 'view' }
    },
    res.response
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /Đã chia sẻ lịch trình với FriendUser/);
  assert.equal(doc.saveCount, 1);
  assert.equal(doc.collaborators.length, 1);
  assert.equal(doc.collaborators[0].user, 'user-friend-2');
  assert.equal(doc.collaborators[0].permission, 'view');

  // Verify notification was dispatched
  assert.ok(dispatchedNotification);
  assert.equal(dispatchedNotification.recipient, 'user-friend-2');
  assert.equal(dispatchedNotification.sender, 'user-owner-1');
  assert.equal(dispatchedNotification.permission, 'view');
  assert.equal(dispatchedNotification.notificationType, 'itinerary_share');
});

test('shareItinerary updates permission for existing collaborator to edit', async () => {
  const initialCollaborators = [
    { user: 'user-friend-2', permission: 'view' }
  ];
  const { doc, queryMock } = makeMockItinerary({
    ownerId: 'user-owner-1',
    collaborators: initialCollaborators
  });
  Itinerary.findById = () => queryMock;
  User.findOne = () => ({
    _id: 'user-friend-2',
    email: 'friend@test.com',
    username: 'FriendUser'
  });

  let dispatchedNotification = null;
  Notification.create = async (payload) => {
    dispatchedNotification = payload;
    return payload;
  };

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'itin-123' },
      user: { _id: 'user-owner-1', username: 'PhucOwner' },
      body: { email: 'friend@test.com', permission: 'edit' }
    },
    res.response
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(doc.collaborators.length, 1);
  assert.equal(doc.collaborators[0].permission, 'edit');
  assert.ok(dispatchedNotification);
  assert.equal(dispatchedNotification.permission, 'edit');
});

test('shareItinerary returns 500 when database save fails', async () => {
  const { doc } = makeMockItinerary({ ownerId: 'user-owner-1' });
  doc.save = async () => {
    throw new Error('Database connection failed');
  };
  Itinerary.findById = () => doc;
  User.findOne = () => ({
    _id: 'user-friend-2',
    email: 'friend@test.com',
    username: 'FriendUser'
  });

  const res = createResponse();
  await shareItinerary(
    {
      params: { id: 'itin-123' },
      user: { _id: 'user-owner-1' },
      body: { email: 'friend@test.com', permission: 'view' }
    },
    res.response
  );

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Không thể chia sẻ lịch trình/);
});

