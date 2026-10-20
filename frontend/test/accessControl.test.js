import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACCESS_ROLES } from '../src/config/accessControl.js';
import { getManagementNavigation } from '../src/config/managementNavigation.js';

const navigationKeys = (role) => getManagementNavigation(role).map((item) => item.key);

test('management navigation exposes only the backlog areas for each actor', () => {
  assert.deepEqual(navigationKeys('admin'), [
    'overview',
    'accounts',
    'roles',
    'activity-logs'
  ]);
  assert.deepEqual(navigationKeys('staff'), [
    'overview',
    'destinations',
    'categories',
    'tour-categories',
    'tours',
    'pending-tours',
    'reviews',
    'announcements',
    'statistics'
  ]);
  assert.deepEqual(navigationKeys('tourProvider'), [
    'overview',
    'my-tours',
    'booking-requests'
  ]);
  assert.deepEqual(navigationKeys('customer'), []);
});

test('page access groups keep actors separated', () => {
  assert.deepEqual([...ACCESS_ROLES.ADMIN_ONLY], ['admin']);
  assert.deepEqual([...ACCESS_ROLES.STAFF_ONLY], ['staff']);
  assert.deepEqual([...ACCESS_ROLES.PROVIDER_ONLY], ['tourProvider']);
  assert.deepEqual([...ACCESS_ROLES.CUSTOMER_ONLY], ['customer']);
  assert.deepEqual([...ACCESS_ROLES.ANNOUNCEMENT_VIEW], ['staff', 'customer', 'tourProvider']);
});
