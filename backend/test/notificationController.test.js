import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  getNotifications,
  getManagedNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  updateNotification,
  deleteNotification
} from '../src/controllers/notificationController.js';
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

test('markNotificationAsRead marks notification as read for recipient', async () => {
  const originalFindOne = Notification.findOne;
  const notifId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  let saved = false;
  const mockNotification = {
    _id: notifId,
    recipient: userId,
    title: 'Test',
    isRead: false,
    save: async () => { saved = true; }
  };

  Notification.findOne = async (query) => {
    if (String(query._id) === String(notifId) && String(query.recipient) === String(userId)) {
      return mockNotification;
    }
    return null;
  };

  try {
    const req = {
      user: { _id: userId },
      params: { id: notifId.toString() }
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await markNotificationAsRead(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.success, true);
    assert.equal(saved, true);
    assert.equal(mockNotification.isRead, true);
  } finally {
    Notification.findOne = originalFindOne;
  }
});

test('markNotificationAsRead returns 404 when notification does not exist or belong to user', async () => {
  const originalFindOne = Notification.findOne;
  Notification.findOne = async () => null;

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      params: { id: new mongoose.Types.ObjectId().toString() }
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await markNotificationAsRead(req, res);
    assert.equal(statusCode, 404);
    assert.equal(jsonBody.success, false);
  } finally {
    Notification.findOne = originalFindOne;
  }
});

test('markAllNotificationsAsRead marks all user notifications as read', async () => {
  const originalUpdateMany = Notification.updateMany;
  const userId = new mongoose.Types.ObjectId();
  let capturedQuery = null;
  let capturedUpdate = null;

  Notification.updateMany = async (query, update) => {
    capturedQuery = query;
    capturedUpdate = update;
    return { modifiedCount: 3 };
  };

  try {
    const req = { user: { _id: userId } };
    let jsonBody = null;
    const res = {
      status() { return this; },
      json(data) { jsonBody = data; return this; }
    };

    await markAllNotificationsAsRead(req, res);
    assert.equal(jsonBody.success, true);
    assert.equal(jsonBody.modifiedCount, 3);
    assert.equal(String(capturedQuery.recipient), String(userId));
    assert.equal(capturedQuery.isRead, false);
    assert.equal(capturedUpdate.$set.isRead, true);
  } finally {
    Notification.updateMany = originalUpdateMany;
  }
});

test('updateNotification updates title and message for staff', async () => {
  const originalFindById = Notification.findById;
  const originalActivityLog = ActivityLog.create;
  ActivityLog.create = async () => ({});

  const notifId = new mongoose.Types.ObjectId();
  let saved = false;
  const mockNotification = {
    _id: notifId,
    title: 'Old Title',
    message: 'Old Message',
    save: async () => { saved = true; }
  };

  Notification.findById = async (id) => {
    if (String(id) === String(notifId)) return mockNotification;
    return null;
  };

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), username: 'staff_1', role: 'staff' },
      params: { id: notifId.toString() },
      body: { title: 'New Title', message: 'New Message' },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await updateNotification(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.success, true);
    assert.equal(saved, true);
    assert.equal(mockNotification.title, 'New Title');
    assert.equal(mockNotification.message, 'New Message');
  } finally {
    Notification.findById = originalFindById;
    ActivityLog.create = originalActivityLog;
  }
});

test('updateNotification returns 404 when notification not found', async () => {
  const originalFindById = Notification.findById;
  Notification.findById = async () => null;

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), username: 'staff_1', role: 'staff' },
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { title: 'New Title', message: 'New Message' },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await updateNotification(req, res);
    assert.equal(statusCode, 404);
    assert.equal(jsonBody.success, false);
  } finally {
    Notification.findById = originalFindById;
  }
});

test('deleteNotification soft-deletes notification by id', async () => {
  const originalFindById = Notification.findById;
  const originalActivityLog = ActivityLog.create;
  ActivityLog.create = async () => ({});

  const notifId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  let saved = false;
  const mockNotification = {
    _id: notifId,
    title: 'Notification to Delete',
    isDeleted: false,
    save: async () => { saved = true; }
  };

  Notification.findById = async (id) => {
    if (String(id) === String(notifId)) return mockNotification;
    return null;
  };

  try {
    const req = {
      user: { _id: staffId, username: 'staff_1', role: 'staff' },
      params: { id: notifId.toString() },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await deleteNotification(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.success, true);
    assert.equal(saved, true);
    assert.equal(mockNotification.isDeleted, true);
    assert.ok(mockNotification.deletedAt instanceof Date);
    assert.equal(String(mockNotification.deletedBy), String(staffId));
  } finally {
    Notification.findById = originalFindById;
    ActivityLog.create = originalActivityLog;
  }
});

test('deleteNotification returns 404 when notification not found', async () => {
  const originalFindById = Notification.findById;
  Notification.findById = async () => null;

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), username: 'staff_1', role: 'staff' },
      params: { id: new mongoose.Types.ObjectId().toString() },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await deleteNotification(req, res);
    assert.equal(statusCode, 404);
    assert.equal(jsonBody.success, false);
  } finally {
    Notification.findById = originalFindById;
  }
});

test('getManagedNotifications returns only system notifications sent by staff', async () => {
  const originalAggregate = Notification.aggregate;

  const mockNotif = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Thông báo hệ thống',
    message: 'Nội dung',
    notificationType: 'system',
    targetType: 'all',
    recipientCount: 5,
    sender: { username: 'staff1', role: 'staff' },
    createdAt: new Date()
  };

  Notification.aggregate = async (pipeline) => {
    if (pipeline.some((stage) => stage.$count)) {
      return [{ total: 1 }];
    }
    return [mockNotif];
  };

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      query: { page: '1', limit: '10' }
    };
    let jsonBody = null;
    const res = {
      status() { return this; },
      json(data) { jsonBody = data; return this; }
    };

    await getManagedNotifications(req, res);
    assert.equal(jsonBody.success, true);
    assert.equal(jsonBody.total, 1);
    assert.equal(jsonBody.notifications.length, 1);
    assert.equal(jsonBody.notifications[0].notificationType, 'system');
  } finally {
    Notification.aggregate = originalAggregate;
  }
});

test('getManagedNotifications filters by targetType when explicitly requested including all', async () => {
  const originalAggregate = Notification.aggregate;
  const capturedMatches = [];

  Notification.aggregate = async (pipeline) => {
    const matchStage = pipeline.find((stage) => stage.$match);
    if (matchStage && !pipeline.some((stage) => stage.$count)) {
      capturedMatches.push(matchStage.$match);
    }
    if (pipeline.some((stage) => stage.$count)) {
      return [{ total: 0 }];
    }
    return [];
  };

  try {
    const res = { status() { return this; }, json() { return this; } };

    await getManagedNotifications({
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      query: { page: '1', limit: '10', targetType: '' }
    }, res);
    assert.equal(capturedMatches[0].targetType, undefined);

    await getManagedNotifications({
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      query: { page: '1', limit: '10', targetType: 'all' }
    }, res);
    assert.equal(capturedMatches[1].targetType, 'all');
  } finally {
    Notification.aggregate = originalAggregate;
  }
});

test('updateNotification updates all active notifications sharing the same batchId', async () => {
  const originalFindById = Notification.findById;
  const originalUpdateMany = Notification.updateMany;
  const originalActivityLog = ActivityLog.create;
  ActivityLog.create = async () => ({});

  const notifId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();
  let capturedFilter = null;
  let capturedUpdate = null;

  Notification.findById = async () => ({
    _id: notifId,
    batchId,
    notificationType: 'system',
    title: 'Old Title',
    message: 'Old Message',
    isDeleted: false
  });

  Notification.updateMany = async (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return { modifiedCount: 10 };
  };

  try {
    const req = {
      user: { _id: new mongoose.Types.ObjectId(), username: 'staff_1', role: 'staff' },
      params: { id: notifId.toString() },
      body: { title: 'Updated Batch Title', message: 'Updated Batch Message' },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await updateNotification(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.success, true);
    assert.equal(String(capturedFilter.batchId), String(batchId));
    assert.deepEqual(capturedFilter.isDeleted, { $ne: true });
    assert.deepEqual(capturedUpdate.$set, {
      title: 'Updated Batch Title',
      message: 'Updated Batch Message'
    });
  } finally {
    Notification.findById = originalFindById;
    Notification.updateMany = originalUpdateMany;
    ActivityLog.create = originalActivityLog;
  }
});

test('updateNotification rejects soft-deleted or non-system notifications', async () => {
  const originalFindById = Notification.findById;
  const notifId = new mongoose.Types.ObjectId();

  try {
    const makeRes = () => {
      const result = { statusCode: 200, body: null };
      return {
        result,
        res: {
          status(code) { result.statusCode = code; return this; },
          json(data) { result.body = data; return this; }
        }
      };
    };

    Notification.findById = async () => ({
      _id: notifId,
      notificationType: 'system',
      isDeleted: true
    });
    const deletedCase = makeRes();
    await updateNotification({
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      params: { id: notifId.toString() },
      body: { title: 'Title', message: 'Message' },
      headers: {}
    }, deletedCase.res);
    assert.equal(deletedCase.result.statusCode, 404);

    Notification.findById = async () => ({
      _id: notifId,
      notificationType: 'itinerary_invite',
      isDeleted: false
    });
    const nonSystemCase = makeRes();
    await updateNotification({
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      params: { id: notifId.toString() },
      body: { title: 'Title', message: 'Message' },
      headers: {}
    }, nonSystemCase.res);
    assert.equal(nonSystemCase.result.statusCode, 400);
  } finally {
    Notification.findById = originalFindById;
  }
});

test('deleteNotification soft-deletes all active notifications sharing the same batchId', async () => {
  const originalFindById = Notification.findById;
  const originalUpdateMany = Notification.updateMany;
  const originalActivityLog = ActivityLog.create;
  ActivityLog.create = async () => ({});

  const notifId = new mongoose.Types.ObjectId();
  const batchId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  let capturedFilter = null;
  let capturedUpdate = null;

  Notification.findById = async () => ({
    _id: notifId,
    batchId,
    notificationType: 'system',
    title: 'Batch To Delete',
    isDeleted: false
  });

  Notification.updateMany = async (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return { modifiedCount: 15 };
  };

  try {
    const req = {
      user: { _id: staffId, username: 'staff_1', role: 'staff' },
      params: { id: notifId.toString() },
      headers: {}
    };

    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await deleteNotification(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonBody.success, true);
    assert.equal(String(capturedFilter.batchId), String(batchId));
    assert.deepEqual(capturedFilter.isDeleted, { $ne: true });
    assert.equal(capturedUpdate.$set.isDeleted, true);
    assert.ok(capturedUpdate.$set.deletedAt instanceof Date);
    assert.equal(String(capturedUpdate.$set.deletedBy), String(staffId));
  } finally {
    Notification.findById = originalFindById;
    Notification.updateMany = originalUpdateMany;
    ActivityLog.create = originalActivityLog;
  }
});

test('deleteNotification rejects already deleted or non-system notifications', async () => {
  const originalFindById = Notification.findById;
  const notifId = new mongoose.Types.ObjectId();

  try {
    const makeRes = () => {
      const result = { statusCode: 200, body: null };
      return {
        result,
        res: {
          status(code) { result.statusCode = code; return this; },
          json(data) { result.body = data; return this; }
        }
      };
    };

    Notification.findById = async () => ({
      _id: notifId,
      notificationType: 'system',
      isDeleted: true
    });
    const deletedCase = makeRes();
    await deleteNotification({
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      params: { id: notifId.toString() },
      headers: {}
    }, deletedCase.res);
    assert.equal(deletedCase.result.statusCode, 404);

    Notification.findById = async () => ({
      _id: notifId,
      notificationType: 'tour_submission',
      isDeleted: false
    });
    const nonSystemCase = makeRes();
    await deleteNotification({
      user: { _id: new mongoose.Types.ObjectId(), role: 'staff' },
      params: { id: notifId.toString() },
      headers: {}
    }, nonSystemCase.res);
    assert.equal(nonSystemCase.result.statusCode, 400);
  } finally {
    Notification.findById = originalFindById;
  }
});
