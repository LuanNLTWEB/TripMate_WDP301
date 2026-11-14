import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';
import { inviteCollaborator } from '../src/controllers/invitationController.js';

const originalItineraryFindById = Itinerary.findById;
const originalUserFindOne = User.findOne;
const originalNotificationFindOne = Notification.findOne;
const originalNotificationCreate = Notification.create;

afterEach(() => {
  Itinerary.findById = originalItineraryFindById;
  User.findOne = originalUserFindOne;
  Notification.findOne = originalNotificationFindOne;
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

const stubUser = (overrides = {}) => ({
  _id: 'user-2',
  username: 'nguoi-dich-vu',
  email: 'nguoidichvu@example.com',
  role: 'customer',
  ...overrides
});

const stubItinerary = ({
  owner = 'user-1',
  collaborators = [],
  title = 'Hành trình me'
} = {}) => ({
  _id: 'it-1',
  owner,
  title,
  collaborators
});

const runInvite = async (body, itinerary, targetUser) => {
  const req = {
    params: { id: 'it-1' },
    user: {
      _id: 'user-1',
      username: 'nguoi-muxin',
      email: 'modal-cap@example.com'
    },
    body
  };

  Itinerary.findById = async () => itinerary;
  User.findOne = async () => targetUser;
  Notification.findOne = async () => null;

  const notifications = [];
  Notification.create = async (payload) => {
    notifications.push(payload);
    return { ...payload, _id: 'notif-1' };
  };

  const result = createResponse();
  await inviteCollaborator(req, result.response);
  return { result, notifications };
};

test('chặn mời khi người nhận không phải customer', async () => {
  const targetUser = stubUser({ role: 'tourProvider' });
  const itinerary = stubItinerary();

  const { result } = await runInvite({ email: 'nguoidichvu@example.com', permission: 'view' }, itinerary, targetUser);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Chỉ có thể mời khách hàng cộng tác lịch trình.');
  assert.equal(targetUser.role, 'tourProvider');
});

test('chặn mời staff cũng trả 400', async () => {
  const targetUser = stubUser({ role: 'staff' });
  const itinerary = stubItinerary();

  const { result } = await runInvite({ email: 'nguoidichvu@example.com', permission: 'edit' }, itinerary, targetUser);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'Chỉ có thể mời khách hàng cộng tác lịch trình.');
});

test('yêu cầu role có thể là giá trị tùy ý', async () => {
  // Kiểm tra rằng chặn chỉ dựa vào role !== 'customer', không phụ thuộc field name.
  const targetUser = stubUser({ role: 'admin' });
  const itinerary = stubItinerary();

  const { result } = await runInvite({ email: 'nguoidichvu@example.com', permission: 'view' }, itinerary, targetUser);

  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, 'Chỉ có thể mời khách hàng cộng tác lịch trình.');
});

test('không tạo notification khi bị chặn role', async () => {
  const targetUser = stubUser({ role: 'tourProvider' });
  const itinerary = stubItinerary();

  const { result, notifications } = await runInvite({ email: 'nguoidichvu@example.com', permission: 'view' }, itinerary, targetUser);

  assert.equal(result.statusCode, 400);
  assert.equal(notifications.length, 0);
});

test('mời customer hợp lệ vẫn hoạt động như cũ (201)', async () => {
  const targetUser = stubUser({ role: 'customer' });
  const itinerary = stubItinerary({ collaborators: [] });

  const { result, notifications } = await runInvite({ email: 'nguoidichvu@example.com', permission: 'view' }, itinerary, targetUser);

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.match(result.body.message, /Đã gửi lời mời cộng tác tới/);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].recipient.toString(), 'user-2');
  assert.equal(notifications[0].notificationType, 'itinerary_invite');
});
