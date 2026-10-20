import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACCESS_ROLES } from '../src/config/accessControl.js';
import { authorize } from '../src/middleware/auth.js';
import accountRoutes from '../src/routes/accountRoutes.js';
import activityLogRoutes from '../src/routes/activityLogRoutes.js';
import announcementRoutes from '../src/routes/announcementRoutes.js';
import authRoutes from '../src/routes/authRoutes.js';
import bookingRoutes from '../src/routes/bookingRoutes.js';
import departureRoutes from '../src/routes/departureRoutes.js';
import destinationCategoryRoutes from '../src/routes/destinationCategoryRoutes.js';
import destinationRoutes from '../src/routes/destinationRoutes.js';
import itineraryRoutes from '../src/routes/itineraryRoutes.js';
import reviewRoutes from '../src/routes/reviewRoutes.js';
import roleRoutes from '../src/routes/roleRoutes.js';
import statsRoutes from '../src/routes/statsRoutes.js';
import tourCategoryRoutes from '../src/routes/tourCategoryRoutes.js';
import tourRoutes from '../src/routes/tourRoutes.js';

const APPLICATION_ROLES = ['admin', 'staff', 'tourProvider', 'customer'];

const assertExactAccess = (allowedRoles) => {
  for (const role of APPLICATION_ROLES) {
    let nextCalled = false;
    const output = { statusCode: 200, body: null };
    const response = {
      status(code) {
        output.statusCode = code;
        return this;
      },
      json(body) {
        output.body = body;
        return this;
      }
    };

    authorize(...allowedRoles)(
      { user: { role } },
      response,
      () => { nextCalled = true; }
    );

    assert.equal(nextCalled, allowedRoles.includes(role), `unexpected access result for ${role}`);
    if (!allowedRoles.includes(role)) {
      assert.equal(output.statusCode, 403);
    }
  }
};

const getRouteRoles = (router, method, path) => {
  const layer = router.stack.find((item) => (
    item.route?.path === path && item.route.methods?.[method.toLowerCase()]
  ));
  assert.ok(layer, `missing ${method.toUpperCase()} ${path}`);
  const authorization = layer.route.stack
    .map((item) => item.handle)
    .find((handler) => Array.isArray(handler.allowedRoles));
  assert.ok(authorization, `missing authorization for ${method.toUpperCase()} ${path}`);
  return [...authorization.allowedRoles];
};

const getRouterRoles = (router) => {
  const authorization = router.stack
    .map((item) => item.handle)
    .find((handler) => Array.isArray(handler.allowedRoles));
  assert.ok(authorization, 'missing router-level authorization');
  return [...authorization.allowedRoles];
};

test('role groups match the actors defined in the backlog', () => {
  assert.deepEqual([...ACCESS_ROLES.ADMIN_ONLY], ['admin']);
  assert.deepEqual([...ACCESS_ROLES.STAFF_ONLY], ['staff']);
  assert.deepEqual([...ACCESS_ROLES.PROVIDER_ONLY], ['tourProvider']);
  assert.deepEqual([...ACCESS_ROLES.CUSTOMER_ONLY], ['customer']);
  assert.deepEqual([...ACCESS_ROLES.REVIEW_REMOVE], ['customer', 'staff']);
  assert.deepEqual([...ACCESS_ROLES.ANNOUNCEMENT_VIEW], ['staff', 'customer', 'tourProvider']);
  assert.deepEqual([...ACCESS_ROLES.TOUR_SCHEDULE_VIEW], ['customer', 'tourProvider']);
  assert.deepEqual([...ACCESS_ROLES.CONTENT_UPLOAD], ['staff', 'tourProvider']);
});

test('authorization middleware enforces every backlog role group exactly', () => {
  Object.values(ACCESS_ROLES).forEach(assertExactAccess);
});

test('sensitive API routes use the exact backlog actor matrix', () => {
  const cases = [
    [authRoutes, 'put', '/profile', ACCESS_ROLES.CUSTOMER_ONLY],
    [authRoutes, 'put', '/change-password', ACCESS_ROLES.CUSTOMER_ONLY],
    [destinationRoutes, 'get', '/favorites', ACCESS_ROLES.CUSTOMER_ONLY],
    [destinationRoutes, 'get', '/management', ACCESS_ROLES.STAFF_ONLY],
    [destinationRoutes, 'get', '/management/:id', ACCESS_ROLES.STAFF_ONLY],
    [destinationRoutes, 'post', '/', ACCESS_ROLES.STAFF_ONLY],
    [destinationRoutes, 'patch', '/:id/status', ACCESS_ROLES.STAFF_ONLY],
    [destinationRoutes, 'put', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [destinationRoutes, 'delete', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [destinationCategoryRoutes, 'post', '/', ACCESS_ROLES.STAFF_ONLY],
    [destinationCategoryRoutes, 'put', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [destinationCategoryRoutes, 'delete', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [tourCategoryRoutes, 'post', '/', ACCESS_ROLES.STAFF_ONLY],
    [tourCategoryRoutes, 'put', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [tourCategoryRoutes, 'delete', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [tourRoutes, 'post', '/', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'get', '/management', ACCESS_ROLES.STAFF_ONLY],
    [tourRoutes, 'get', '/management/:id', ACCESS_ROLES.STAFF_ONLY],
    [tourRoutes, 'get', '/provider', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'get', '/provider/:id', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'put', '/:id', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'put', '/:id/capacity', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'patch', '/:id/price', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'patch', '/:id/departure', ACCESS_ROLES.PROVIDER_ONLY],
    [tourRoutes, 'get', '/:id/schedule', ACCESS_ROLES.TOUR_SCHEDULE_VIEW],
    [tourRoutes, 'patch', '/:id/status', ACCESS_ROLES.STAFF_ONLY],
    [tourRoutes, 'patch', '/:id/restore', ACCESS_ROLES.STAFF_ONLY],
    [tourRoutes, 'patch', '/:id/revision', ACCESS_ROLES.STAFF_ONLY],
    [departureRoutes, 'get', '/', ACCESS_ROLES.PROVIDER_ONLY],
    [departureRoutes, 'post', '/', ACCESS_ROLES.PROVIDER_ONLY],
    [departureRoutes, 'put', '/:id', ACCESS_ROLES.PROVIDER_ONLY],
    [departureRoutes, 'patch', '/:id', ACCESS_ROLES.PROVIDER_ONLY],
    [bookingRoutes, 'post', '/:tourId', ACCESS_ROLES.CUSTOMER_ONLY],
    [bookingRoutes, 'get', '/my', ACCESS_ROLES.CUSTOMER_ONLY],
    [bookingRoutes, 'get', '/provider', ACCESS_ROLES.PROVIDER_ONLY],
    [bookingRoutes, 'patch', '/:id/cancel', ACCESS_ROLES.CUSTOMER_ONLY],
    [reviewRoutes, 'get', '/tours/:tourId', ACCESS_ROLES.CUSTOMER_ONLY],
    [reviewRoutes, 'post', '/tours/:tourId', ACCESS_ROLES.CUSTOMER_ONLY],
    [reviewRoutes, 'get', '/moderation', ACCESS_ROLES.STAFF_ONLY],
    [reviewRoutes, 'get', '/reported', ACCESS_ROLES.STAFF_ONLY],
    [reviewRoutes, 'post', '/:id/report', ACCESS_ROLES.CUSTOMER_ONLY],
    [reviewRoutes, 'patch', '/:id/moderate', ACCESS_ROLES.STAFF_ONLY],
    [reviewRoutes, 'patch', '/:id/hide', ACCESS_ROLES.STAFF_ONLY],
    [reviewRoutes, 'patch', '/:id/restore', ACCESS_ROLES.STAFF_ONLY],
    [reviewRoutes, 'put', '/:id', ACCESS_ROLES.CUSTOMER_ONLY],
    [reviewRoutes, 'delete', '/:id', ACCESS_ROLES.CUSTOMER_ONLY],
    [statsRoutes, 'get', '/platform', ACCESS_ROLES.STAFF_ONLY],
    [announcementRoutes, 'get', '/', ACCESS_ROLES.ANNOUNCEMENT_VIEW],
    [announcementRoutes, 'get', '/management', ACCESS_ROLES.STAFF_ONLY],
    [announcementRoutes, 'post', '/', ACCESS_ROLES.STAFF_ONLY],
    [announcementRoutes, 'put', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [announcementRoutes, 'delete', '/:id', ACCESS_ROLES.STAFF_ONLY],
    [itineraryRoutes, 'get', '/', ACCESS_ROLES.CUSTOMER_ONLY],
    [itineraryRoutes, 'post', '/', ACCESS_ROLES.CUSTOMER_ONLY],
    [itineraryRoutes, 'get', '/:id/budget', ACCESS_ROLES.CUSTOMER_ONLY],
    [itineraryRoutes, 'put', '/:id', ACCESS_ROLES.CUSTOMER_ONLY],
    [itineraryRoutes, 'put', '/:id/owner', ACCESS_ROLES.CUSTOMER_ONLY],
    [itineraryRoutes, 'delete', '/:id/leave', ACCESS_ROLES.CUSTOMER_ONLY],
    [itineraryRoutes, 'delete', '/:id', ACCESS_ROLES.CUSTOMER_ONLY]
  ];

  for (const [router, method, path, expectedRoles] of cases) {
    assert.deepEqual(getRouteRoles(router, method, path), [...expectedRoles]);
  }

  assert.deepEqual(getRouterRoles(accountRoutes), [...ACCESS_ROLES.ADMIN_ONLY]);
  assert.deepEqual(getRouterRoles(roleRoutes), [...ACCESS_ROLES.ADMIN_ONLY]);
  assert.deepEqual(getRouterRoles(activityLogRoutes), [...ACCESS_ROLES.ADMIN_ONLY]);
});
