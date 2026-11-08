import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import { getActivityConflicts, checkTimeConflict } from '../src/controllers/itineraryController.js';

const originalFindById = Itinerary.findById;

afterEach(() => {
  Itinerary.findById = originalFindById;
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

test('UC-58: getActivityConflicts returns overlap window and minutes for overlapping same-day activities', async () => {
  Itinerary.findById = async () => ({
    _id: 'itin-1',
    owner: 'customer-1',
    collaborators: [],
    activities: [
      {
        _id: 'act-1',
        title: 'Tham quan Bà Nà Hills',
        date: new Date('2026-11-10T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '11:30',
        location: 'Đà Nẵng'
      },
      {
        _id: 'act-2',
        title: 'Ăn trưa Hải sản Mỹ Khê',
        date: new Date('2026-11-10T00:00:00.000Z'),
        startTime: '11:00',
        endTime: '12:30',
        location: 'Biển Mỹ Khê'
      }
    ]
  });

  const result = createResponse();
  await getActivityConflicts(
    { params: { id: 'itin-1' }, user: { _id: 'customer-1' } },
    result.response
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.hasConflict, true);
  assert.equal(result.body.conflictCount, 1);
  assert.equal(result.body.conflicts.length, 1);
  assert.equal(result.body.conflicts[0].overlapStart, '11:00');
  assert.equal(result.body.conflicts[0].overlapEnd, '11:30');
  assert.equal(result.body.conflicts[0].overlapMinutes, 30);
});

test('UC-58: checkTimeConflict detects overlap and suggests next available free slot on the same day', async () => {
  Itinerary.findById = async () => ({
    _id: 'itin-1',
    owner: 'customer-1',
    collaborators: [],
    activities: [
      {
        _id: 'act-1',
        title: 'Đi cáp treo Fansipan',
        date: new Date('2026-11-10T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '10:00',
        location: 'Sa Pa'
      },
      {
        _id: 'act-2',
        title: 'Bản Cát Cát',
        date: new Date('2026-11-10T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '12:00',
        location: 'Sa Pa'
      }
    ]
  });

  const result = createResponse();
  await checkTimeConflict(
    {
      params: { id: 'itin-1' },
      user: { _id: 'customer-1' },
      body: {
        date: '2026-11-10',
        startTime: '09:00',
        endTime: '10:30'
      }
    },
    result.response
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.hasConflict, true);
  assert.equal(result.body.conflictCount, 2);
  assert.deepEqual(result.body.suggestedSlot, {
    startTime: '12:00',
    endTime: '13:30'
  });
});

test('UC-58: checkTimeConflict excludes activity being edited via excludeActivityId', async () => {
  Itinerary.findById = async () => ({
    _id: 'itin-1',
    owner: 'customer-1',
    collaborators: [],
    activities: [
      {
        _id: 'act-1',
        title: 'Đi cáp treo Fansipan',
        date: new Date('2026-11-10T00:00:00.000Z'),
        startTime: '08:00',
        endTime: '10:00',
        location: 'Sa Pa'
      }
    ]
  });

  const result = createResponse();
  await checkTimeConflict(
    {
      params: { id: 'itin-1' },
      user: { _id: 'customer-1' },
      body: {
        date: '2026-11-10',
        startTime: '08:30',
        endTime: '10:30',
        excludeActivityId: 'act-1'
      }
    },
    result.response
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.hasConflict, false);
  assert.equal(result.body.conflictCount, 0);
  assert.equal(result.body.suggestedSlot, null);
});
