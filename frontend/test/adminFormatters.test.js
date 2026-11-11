import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAdminDate,
  formatAdminDateTime,
  getAccountStatusMeta,
  getRoleMeta
} from '../src/utils/adminFormatters.js';

describe('adminFormatters', () => {
  it('normalizes user role to customer and maps badge classes cleanly', () => {
    assert.deepEqual(getRoleMeta('user'), {
      key: 'customer',
      label: 'Khách hàng',
      badgeClass: 'badge-secondary',
      solidBadgeClass: 'bg-secondary text-white'
    });
    assert.deepEqual(getRoleMeta('admin'), {
      key: 'admin',
      label: 'Quản trị viên',
      badgeClass: 'badge-warning',
      solidBadgeClass: 'bg-warning text-dark'
    });
    assert.equal(getRoleMeta('customRole').badgeClass, 'badge-secondary');
  });

  it('maps active state to Vietnamese management badge labels', () => {
    assert.deepEqual(getAccountStatusMeta(true), {
      label: 'Đang hoạt động',
      badgeClass: 'badge-success'
    });
    assert.deepEqual(getAccountStatusMeta(false), {
      label: 'Đã vô hiệu hóa',
      badgeClass: 'badge-danger'
    });
  });

  it('formats empty date values cleanly as dash', () => {
    assert.equal(formatAdminDate(null), '—');
    assert.equal(formatAdminDateTime(undefined), '—');
  });
});
