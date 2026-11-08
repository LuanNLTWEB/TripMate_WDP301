import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import { duplicateItinerary } from '../src/controllers/itineraryController.js';

const originalFindById = Itinerary.findById;
const originalCreate = Itinerary.create;

afterEach(() => {
  Itinerary.findById = originalFindById;
  Itinerary.create = originalCreate;
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

test('rejects duplicate when user is neither owner nor accepted collaborator', async () => {
  Itinerary.findById = () => ({
    _id: 'itin-1',
    title: 'Da Nang Trip',
    owner: 'user-other',
    collaborators: []
  });

  const res = createResponse();
  await duplicateItinerary(
    {
      params: { id: 'itin-1' },
      user: { _id: 'user-intruder' },
      body: {}
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test('duplicates shared itinerary into independent record, stripping collaborators and comments (BR-73)', async () => {
  const sourceStart = new Date('2026-11-10T00:00:00.000Z');
  const sourceEnd = new Date('2026-11-12T00:00:00.000Z');
  const actDate = new Date('2026-11-11T00:00:00.000Z');

  const sourceItinerary = {
    _id: 'itin-source',
    title: 'Hue Heritage Tour',
    owner: 'user-owner',
    startDate: sourceStart,
    endDate: sourceEnd,
    budget: 5000000,
    destinations: ['dest-1'],
    tours: ['tour-1'],
    activities: [
      {
        title: 'Dai Noi Visit',
        date: actDate,
        startTime: '09:00',
        endTime: '11:30',
        location: 'Dai Noi',
        estimatedCost: 200000,
        notes: 'Bring water'
      }
    ],
    packingItems: [
      { name: 'Passport', isPacked: true },
      { name: 'Hat', isPacked: true }
    ],
    collaborators: [{ user: 'user-collaborator', permission: 'view' }],
    comments: [{ user: 'user-collaborator', content: 'Excited!' }]
  };

  const mockQuery = (result) => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    catch(reject) { return Promise.resolve(result).catch(reject); }
  });

  Itinerary.findById = (id) => {
    if (id === 'itin-source') {
      return mockQuery(sourceItinerary);
    }
    const populatedDoc = {
      ...sourceItinerary,
      _id: 'itin-new',
      owner: { _id: 'user-collaborator', username: 'phuclh' },
      collaborators: [],
      comments: [],
      toObject: () => ({
        ...sourceItinerary,
        _id: 'itin-new',
        owner: { _id: 'user-collaborator', username: 'phuclh' },
        collaborators: [],
        comments: []
      })
    };
    return mockQuery(populatedDoc);
  };

  let createdPayload = null;
  Itinerary.create = async (payload) => {
    createdPayload = payload;
    return {
      ...payload,
      _id: 'itin-new'
    };
  };

  const res = createResponse();
  await duplicateItinerary(
    {
      params: { id: 'itin-source' },
      user: { _id: 'user-collaborator' },
      body: {
        title: 'Chuyến đi Huế của tôi',
        startDate: '2026-12-01'
      }
    },
    res.response
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.ok(createdPayload);

  // BR-73: Owner is the duplicating customer
  assert.equal(createdPayload.owner, 'user-collaborator');
  assert.equal(createdPayload.title, 'Chuyến đi Huế của tôi');

  // BR-73: Collaborators and comments are stripped
  assert.deepEqual(createdPayload.collaborators, []);
  assert.deepEqual(createdPayload.comments, []);

  // Packing items are reset to isPacked = false
  assert.equal(createdPayload.packingItems.length, 2);
  assert.equal(createdPayload.packingItems[0].isPacked, false);
  assert.equal(createdPayload.packingItems[1].isPacked, false);

  // Proportional date shift: original was Nov 10 -> Nov 12, new is Dec 1 -> Dec 3
  const expectedNewStart = new Date('2026-12-01T00:00:00.000Z');
  assert.equal(createdPayload.startDate.toISOString().slice(0, 10), '2026-12-01');
  assert.equal(createdPayload.endDate.toISOString().slice(0, 10), '2026-12-03');

  // Activity was originally on day 2 (Nov 11), now shifts to day 2 (Dec 2)
  assert.equal(createdPayload.activities[0].date.toISOString().slice(0, 10), '2026-12-02');
});
