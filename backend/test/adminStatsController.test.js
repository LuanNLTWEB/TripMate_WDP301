import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAdminDashboardStats } from '../src/controllers/statsController.js';
import User from '../src/models/User.js';
import Role from '../src/models/Role.js';

test('getAdminDashboardStats returns structured account stats for admin', async () => {
  // Mock DB responses
  const originalCountDocuments = User.countDocuments;
  const originalAggregate = User.aggregate;
  const originalUserFind = User.find;
  const originalRoleFind = Role.find;

  try {
    User.countDocuments = async (filter) => {
      if (filter && filter.isActive === false) return 2;
      if (filter && filter.isActive && filter.isActive.$ne === false) return 10;
      return 12;
    };

    Role.find = () => ({
      lean: async () => [
        { _id: 'role1', name: 'admin' },
        { _id: 'role2', name: 'staff' },
        { _id: 'role3', name: 'tourProvider' },
        { _id: 'role4', name: 'customer' }
      ]
    });

    User.aggregate = async (pipeline) => {
      // If group has year/month -> monthly aggregate
      const groupStage = pipeline.find((stage) => stage.$group);
      if (groupStage?.$group?._id?.year) {
        const now = new Date();
        return [
          { _id: { year: now.getFullYear(), month: now.getMonth() + 1 }, count: 5 }
        ];
      }
      // Role aggregate
      return [
        { _id: 'customer', count: 7 },
        { _id: 'admin', count: 2 },
        { _id: 'staff', count: 2 },
        { _id: 'tourProvider', count: 1 }
      ];
    };

    User.find = () => ({
      sort: () => ({
        limit: () => ({
          select: () => ({
            lean: async () => [
              {
                _id: 'u1',
                username: 'admin_test',
                email: 'admin@test.com',
                role: 'admin',
                isActive: true,
                createdAt: new Date()
              }
            ]
          })
        })
      })
    });

    const req = {
      query: { months: '6' },
      user: { _id: 'admin_id', role: 'admin' }
    };

    let resultJson = null;
    let statusCode = 200;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resultJson = data;
        return this;
      }
    };

    await getAdminDashboardStats(req, res);

    assert.equal(statusCode, 200);
    assert.equal(resultJson.success, true);
    assert.ok(resultJson.stats);
    assert.equal(resultJson.stats.summary.totalAccounts, 12);
    assert.equal(resultJson.stats.summary.activeAccounts, 10);
    assert.equal(resultJson.stats.summary.disabledAccounts, 2);
    assert.equal(resultJson.stats.summary.activePercentage, 83.3);
    assert.equal(resultJson.stats.summary.disabledPercentage, 16.7);

    // Verify roles breakdown contains admin, staff, tourProvider, customer
    const roleKeys = resultJson.stats.roles.map((r) => r.key);
    assert.ok(roleKeys.includes('admin'));
    assert.ok(roleKeys.includes('staff'));
    assert.ok(roleKeys.includes('tourProvider'));
    assert.ok(roleKeys.includes('customer'));

    // Verify monthly series length equals requested months (6)
    assert.equal(resultJson.stats.monthlyRegistrations.length, 6);

    // Verify recent accounts mapping
    assert.equal(resultJson.stats.recentAccounts.length, 1);
    assert.equal(resultJson.stats.recentAccounts[0].username, 'admin_test');
  } finally {
    User.countDocuments = originalCountDocuments;
    User.aggregate = originalAggregate;
    User.find = originalUserFind;
    Role.find = originalRoleFind;
  }
});
