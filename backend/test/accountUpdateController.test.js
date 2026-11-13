import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import User from '../src/models/User.js';
import ActivityLog from '../src/models/ActivityLog.js';
import { updateAccount } from '../src/controllers/accountController.js';

const originalUserFindOne = User.findOne;
const originalUserFindByIdAndUpdate = User.findByIdAndUpdate;
const originalActivityLogCreate = ActivityLog.create;

afterEach(() => {
  User.findOne = originalUserFindOne;
  User.findByIdAndUpdate = originalUserFindByIdAndUpdate;
  ActivityLog.create = originalActivityLogCreate;
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

test('admin updates username, phone, and dateOfBirth for a Staff account', async () => {
  const adminUser = { _id: 'admin-1', username: 'superadmin', email: 'admin@tripmate.com' };
  const staffAccount = {
    _id: 'staff-1',
    username: 'oldstaff',
    email: 'staff@tripmate.com',
    role: 'staff',
    phone: '0901234567',
    dateOfBirth: new Date('1995-01-01'),
    gender: 'female',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let updatedPayload = null;
  let loggedActivity = null;

  User.findOne = async (filter) => {
    // Duplicate check
    if (filter.username) return null;
    // Finding target account
    if (filter._id === 'staff-1') return staffAccount;
    return null;
  };

  User.findByIdAndUpdate = async (id, updateDoc) => {
    updatedPayload = updateDoc.$set;
    return {
      ...staffAccount,
      ...updateDoc.$set,
      updatedAt: new Date()
    };
  };

  ActivityLog.create = async (doc) => {
    loggedActivity = doc;
    return doc;
  };

  const req = {
    params: { id: 'staff-1' },
    user: adminUser,
    headers: {},
    body: {
      username: 'newstaff_99',
      phone: '0987654321',
      dateOfBirth: '1996-05-15',
      role: 'staff'
    }
  };

  const resObj = createResponse();
  await updateAccount(req, resObj.response);

  assert.equal(updatedPayload.username, 'newstaff_99');
  assert.equal(updatedPayload.phone, '0987654321');
  assert.equal(new Date(updatedPayload.dateOfBirth).toISOString().substring(0, 10), '1996-05-15');
  assert.ok(loggedActivity);
  assert.equal(loggedActivity.action, 'UPDATE_ACCOUNT_ROLE');
  assert.match(loggedActivity.details, /newstaff_99/);
  assert.equal(resObj.statusCode, 200);
});

test('admin updates username, phone, and dateOfBirth for a Tour Provider account', async () => {
  const adminUser = { _id: 'admin-1', username: 'superadmin', email: 'admin@tripmate.com' };
  const providerAccount = {
    _id: 'provider-1',
    username: 'oldprovider',
    email: 'provider@tripmate.com',
    role: 'tourProvider',
    phone: '0911222333',
    dateOfBirth: new Date('1990-10-10'),
    gender: 'male',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let updatedPayload = null;

  User.findOne = async (filter) => {
    if (filter.username) return null;
    if (filter._id === 'provider-1') return providerAccount;
    return null;
  };

  User.findByIdAndUpdate = async (id, updateDoc) => {
    updatedPayload = updateDoc.$set;
    return {
      ...providerAccount,
      ...updateDoc.$set,
      updatedAt: new Date()
    };
  };

  ActivityLog.create = async () => {};

  const req = {
    params: { id: 'provider-1' },
    user: adminUser,
    headers: {},
    body: {
      username: 'danang_travel',
      phone: '0933444555',
      dateOfBirth: '1992-12-25',
      role: 'tourProvider'
    }
  };

  const resObj = createResponse();
  await updateAccount(req, resObj.response);

  assert.equal(updatedPayload.username, 'danang_travel');
  assert.equal(updatedPayload.phone, '0933444555');
  assert.equal(new Date(updatedPayload.dateOfBirth).toISOString().substring(0, 10), '1992-12-25');
  assert.equal(resObj.statusCode, 200);
});

test('rejects duplicate username when updating a Staff account', async () => {
  const adminUser = { _id: 'admin-1', username: 'superadmin' };
  const staffAccount = {
    _id: 'staff-1',
    username: 'currentstaff',
    role: 'staff',
    isDeleted: false
  };

  User.findOne = async (filter) => {
    if (filter.username === 'taken_username') {
      return { _id: 'someone-else', username: 'taken_username' };
    }
    if (filter._id === 'staff-1') return staffAccount;
    return null;
  };

  const req = {
    params: { id: 'staff-1' },
    user: adminUser,
    headers: {},
    body: {
      username: 'taken_username',
      role: 'staff'
    }
  };

  const resObj = createResponse();
  await updateAccount(req, resObj.response);

  assert.equal(resObj.statusCode, 400);
  assert.match(resObj.body.message, /Tên người dùng đã được sử dụng/);
});

test('does NOT update username/phone/dateOfBirth for Customer account, only role', async () => {
  const adminUser = { _id: 'admin-1', username: 'superadmin' };
  const customerAccount = {
    _id: 'cust-1',
    username: 'cust_username',
    email: 'cust@gmail.com',
    role: 'customer',
    phone: '0909090909',
    dateOfBirth: new Date('2000-01-01'),
    isDeleted: false
  };

  let updatedPayload = null;

  User.findOne = async (filter) => {
    if (filter._id === 'cust-1') return customerAccount;
    return null;
  };

  User.findByIdAndUpdate = async (id, updateDoc) => {
    updatedPayload = updateDoc.$set;
    return {
      ...customerAccount,
      ...updateDoc.$set
    };
  };

  ActivityLog.create = async () => {};

  const req = {
    params: { id: 'cust-1' },
    user: adminUser,
    headers: {},
    body: {
      username: 'attempted_new_username',
      phone: '0988888888',
      dateOfBirth: '1999-09-09',
      role: 'staff' // changing role from customer to staff
    }
  };

  const resObj = createResponse();
  await updateAccount(req, resObj.response);

  // Since target account was customer, username/phone/dateOfBirth are NOT modified in this operation
  assert.equal(updatedPayload.username, undefined);
  assert.equal(updatedPayload.phone, undefined);
  assert.equal(updatedPayload.dateOfBirth, undefined);
  assert.equal(updatedPayload.role, 'staff');
  assert.equal(resObj.statusCode, 200);
});

test('blocks admin from changing their own role', async () => {
  const adminUser = { _id: 'admin-1', username: 'superadmin' };
  const adminAccount = {
    _id: 'admin-1',
    username: 'superadmin',
    role: 'admin',
    isDeleted: false
  };

  User.findOne = async () => adminAccount;

  const req = {
    params: { id: 'admin-1' },
    user: adminUser,
    headers: {},
    body: {
      role: 'staff'
    }
  };

  const resObj = createResponse();
  await updateAccount(req, resObj.response);

  assert.equal(resObj.statusCode, 400);
  assert.match(resObj.body.message, /Không thể thay đổi vai trò của chính bạn/);
});
