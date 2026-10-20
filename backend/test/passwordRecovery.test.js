import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { forgotPassword, verifyOtp, resetPassword } from '../src/controllers/authController.js';
import User from '../src/models/User.js';
import Otp from '../src/models/Otp.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'TRIPMATE_TEST_SECRET';

test('forgotPassword returns 404 when user email does not exist', async () => {
  const originalFindOne = User.findOne;
  User.findOne = async () => null;

  try {
    const req = { body: { email: 'nonexistent@example.com' } };
    let status = 200;
    let jsonBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await forgotPassword(req, res);
    assert.equal(status, 404);
    assert.equal(jsonBody.success, false);
    assert.match(jsonBody.message, /Không tìm thấy/);
  } finally {
    User.findOne = originalFindOne;
  }
});

test('verifyOtp returns 400 and increments failedAttempts on wrong OTP', async () => {
  const originalFindOne = Otp.findOne;
  let savedAttempts = 0;
  const mockOtp = {
    _id: 'otp123',
    email: 'test@example.com',
    expiresAt: new Date(Date.now() + 600000),
    failedAttempts: 1,
    compareOtp: async () => false,
    save: async function() { savedAttempts = this.failedAttempts; }
  };
  Otp.findOne = async () => mockOtp;

  try {
    const req = { body: { email: 'test@example.com', otp: '123456' } };
    let status = 200;
    let jsonBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await verifyOtp(req, res);
    assert.equal(status, 400);
    assert.equal(jsonBody.success, false);
    assert.equal(savedAttempts, 2);
    assert.equal(jsonBody.remainingAttempts, 1);
  } finally {
    Otp.findOne = originalFindOne;
  }
});

test('verifyOtp deletes OTP and flags maxAttemptsReached when failing 3 times', async () => {
  const originalFindOne = Otp.findOne;
  const originalDelete = Otp.findByIdAndDelete;
  let deletedId = null;

  const mockOtp = {
    _id: 'otp123',
    email: 'test@example.com',
    expiresAt: new Date(Date.now() + 600000),
    failedAttempts: 2,
    compareOtp: async () => false,
    save: async function() {}
  };
  Otp.findOne = async () => mockOtp;
  Otp.findByIdAndDelete = async (id) => { deletedId = id; };

  try {
    const req = { body: { email: 'test@example.com', otp: '123456' } };
    let status = 200;
    let jsonBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await verifyOtp(req, res);
    assert.equal(status, 400);
    assert.equal(jsonBody.maxAttemptsReached, true);
    assert.equal(deletedId, 'otp123');
  } finally {
    Otp.findOne = originalFindOne;
    Otp.findByIdAndDelete = originalDelete;
  }
});

test('verifyOtp deletes OTP and issues resetToken on matching OTP', async () => {
  const originalFindOne = Otp.findOne;
  const originalDelete = Otp.findByIdAndDelete;
  let deletedId = null;

  const mockOtp = {
    _id: 'otp123',
    email: 'test@example.com',
    expiresAt: new Date(Date.now() + 600000),
    failedAttempts: 0,
    compareOtp: async () => true
  };
  Otp.findOne = async () => mockOtp;
  Otp.findByIdAndDelete = async (id) => { deletedId = id; };

  try {
    const req = { body: { email: 'test@example.com', otp: '654321' } };
    let status = 200;
    let jsonBody = null;
    const res = {
      status(code) { status = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    await verifyOtp(req, res);
    assert.equal(status, 200);
    assert.equal(jsonBody.success, true);
    assert.ok(jsonBody.resetToken);
    assert.equal(deletedId, 'otp123');

    const decoded = jwt.verify(jsonBody.resetToken, process.env.JWT_SECRET);
    assert.equal(decoded.email, 'test@example.com');
    assert.equal(decoded.purpose, 'reset_password');
  } finally {
    Otp.findOne = originalFindOne;
    Otp.findByIdAndDelete = originalDelete;
  }
});
