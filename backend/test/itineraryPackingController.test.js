import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import { addPackingItem } from '../src/controllers/itineraryController.js';

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

test('addPackingItem returns 404 when itinerary does not exist', async () => {
  Itinerary.findById = () => Promise.resolve(null);

  const res = createResponse();
  await addPackingItem(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { name: 'Áo khoác gió' },
      user: { _id: '507f1f77bcf86cd799439099' }
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test('addPackingItem returns 404 when user is not owner and not an editor collaborator', async () => {
  const fakeItinerary = {
    _id: '507f1f77bcf86cd799439011',
    owner: '507f1f77bcf86cd799439001',
    collaborators: [{ user: '507f1f77bcf86cd799439002', permission: 'view' }],
    packingItems: []
  };

  Itinerary.findById = () => Promise.resolve(fakeItinerary);

  const res = createResponse();
  await addPackingItem(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { name: 'Kem chống nắng' },
      user: { _id: '507f1f77bcf86cd799439002' }
    },
    res.response
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test('addPackingItem successfully appends packing item for itinerary owner', async () => {
  const fakeItinerary = {
    _id: '507f1f77bcf86cd799439011',
    owner: '507f1f77bcf86cd799439001',
    collaborators: [],
    packingItems: [],
    save: async function () {
      return this;
    }
  };

  Itinerary.findById = (id) => ({
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

  const res = createResponse();
  await addPackingItem(
    {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { name: 'Sạc dự phòng' },
      user: { _id: '507f1f77bcf86cd799439001' }
    },
    res.response
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.packingItem.name, 'Sạc dự phòng');
  assert.equal(res.body.packingItem.isPacked, false);
});

