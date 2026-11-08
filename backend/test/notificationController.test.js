import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { getNotifications, createNotification } from '../src/controllers/notificationController.js';
import Notification from '../src/models/Notification.js';
import User from '../src/models/User.js';
import ActivityLog from '../src/models/ActivityLog.js';

test('getNotifications returns user notifications and unread count', async () => {
  const originalCount = Notification.countDocuments;
  const originalFind = Notification.find;

  Notification.countDocuments = async (filter) => {
    if (filter.isRead === false) return 2;
    return 5;
  };

  const mockQuery = {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() {
      return [
        { _id: '507f1f77bcf86cd799439011', title: 'Thông báo 1', message: 'Nội dung 1', isRead: false },
        { _id: '507f1f77bcf86cd799439012', title: 'Thông báo 2', message: 'Nội dung 2', isRead: true }
      ];
    }
  };
  Notification.find = () => mockQuery;

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      query: { page: '1', limit: '10' }
    };
    let jsonBody = null;
    const res = {
      status() { return this; },
      json(data) { jsonBody = data; return this; }
    };

    await getNotifications(req, res);
    assert.equal(jsonBody.success, true);
    assert.equal(jsonBody.total, 5);
    assert.equal(jsonBody.unreadCount, 2);
    assert.equal(jsonBody.notifications.length, 2);
    assert.equal(jsonBody.currentPage, 1);
  } finally {
    Notification.countDocuments = originalCount;
    Notification.find = originalFind;
  }
});

test('createNotification sends notifications to matching audience users', async () => {
  const originalFind = User.find;
  const originalInsertMany = Notification.insertMany;
  const originalActivityLog = ActivityLog.create;

  ActivityLog.create = async () => ({});

  const user1Id = new mongoose.Types.ObjectId();
  const user2Id = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();

  User.find = () => ({
    select: async () => [{ _id: user1Id }, { _id: user2Id }]
  });

  let insertedDocs = [];
  Notification.insertMany = async (docs) => {
    insertedDocs = docs;
    return docs;
  };

  try {
    const req = {
      user: { _id: staffId, username: 'staff_user', role: 'staff' },
      body: {
        title: 'Bảo trì hệ thống',
        message: 'Hệ thống sẽ bảo trì lúc 0h',
        targetType: 'customer'
      },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await createNotification(req, res);
    assert.equal(statusCode, 201);
    assert.equal(jsonBody.success, true);
    assert.equal(jsonBody.count, 2);
    assert.equal(insertedDocs.length, 2);
    assert.equal(insertedDocs[0].title, 'Bảo trì hệ thống');
    assert.equal(String(insertedDocs[0].recipient), String(user1Id));
  } finally {
    User.find = originalFind;
    Notification.insertMany = originalInsertMany;
    ActivityLog.create = originalActivityLog;
  }
});

test('createNotification returns 404 when targetEmail does not exist for specific_user', async () => {
  const originalFindOne = User.findOne;
  User.findOne = () => ({
    select: async () => null
  });

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), username: 'staff_user', role: 'staff' },
      body: {
        title: 'Nhắc nhở',
        message: 'Vui lòng cập nhật hồ sơ',
        targetType: 'specific_user',
        targetEmail: 'unknown@example.com'
      },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await createNotification(req, res);
    assert.equal(statusCode, 404);
    assert.equal(jsonBody.success, false);
    assert.match(jsonBody.message, /Không tìm thấy người dùng/);
  } finally {
    User.findOne = originalFindOne;
  }
});
