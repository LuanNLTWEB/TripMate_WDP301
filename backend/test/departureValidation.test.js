import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validationResult } from 'express-validator';
import { updateDepartureValidation } from '../src/middleware/validate.js';

// Chạy chuỗi validator của express-validator trên một request giả để kiểm tra rule.
const runValidation = async (body) => {
  const req = {
    body,
    params: { id: '507f1f77bcf86cd799439011' },
    query: {}
  };

  for (const validator of updateDepartureValidation) {
    await validator(req, {}, () => {});
  }

  return validationResult(req);
};

test('updateDepartureValidation accepts a seat count of 1', async () => {
  const result = await runValidation({ availableSeats: 1 });
  assert.equal(result.isEmpty(), true);
});

test('updateDepartureValidation rejects a seat count of 0 (UC-42)', async () => {
  const result = await runValidation({ availableSeats: 0 });
  assert.equal(result.isEmpty(), false);
  const [error] = result.array();
  assert.equal(error.path, 'availableSeats');
  assert.match(error.msg, /số chỗ phải lớn hơn 0/);
});

test('updateDepartureValidation rejects a negative seat count', async () => {
  const result = await runValidation({ availableSeats: -1 });
  assert.equal(result.isEmpty(), false);
  assert.equal(result.array()[0].path, 'availableSeats');
});
