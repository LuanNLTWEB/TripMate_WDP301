import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_OPEN_SECTIONS,
  areAllVisibleSectionsOpen,
  executeUnifiedSave,
  getDirtyState,
  getTourCategoryName,
  getTourStatusMeta,
  normalizeTourRecord,
  toggleVisibleSections,
  validateCapacityInput
} from '../src/utils/providerTourDetailsHelpers.js';

describe('providerTourDetailsHelpers', () => {
  it('resolves tour status labels and CSS classes cleanly', () => {
    assert.deepEqual(getTourStatusMeta('needs_revision'), {
      statusClass: 'is-revision',
      statusLabel: 'Cần chỉnh sửa'
    });
    assert.deepEqual(getTourStatusMeta('unknown'), {
      statusClass: 'is-active',
      statusLabel: 'Đang hoạt động'
    });
  });

  it('extracts category name from populated object or raw fallback', () => {
    assert.equal(getTourCategoryName({ _id: '1', name: 'Biển đảo' }), 'Biển đảo');
    assert.equal(getTourCategoryName('cat-id'), 'cat-id');
    assert.equal(getTourCategoryName(null), '—');
  });

  it('filters out soft-deleted itinerary entries during normalization', () => {
    const normalized = normalizeTourRecord({
      _id: 'tour-1',
      itinerary: [
        { day: 1, title: 'Day 1', isDeleted: false },
        { day: 2, title: 'Deleted day', isDeleted: true },
        { day: 3, title: 'Day 3' }
      ]
    });
    assert.equal(normalized.itinerary.length, 2);
    assert.deepEqual(normalized.itinerary.map((d) => d.day), [1, 3]);
  });

  it('tracks independent dirty flags for details and capacity', () => {
    const baseTour = {
      includedServices: ['Xe đưa đón'],
      excludedServices: ['VAT'],
      cancellationPolicy: 'Hủy trước 3 ngày',
      notes: 'Mang CMND',
      availableSeats: 20
    };

    const clean = getDirtyState({
      tour: baseTour,
      includedServices: ['Xe đưa đón'],
      excludedServices: ['VAT'],
      cancellationPolicy: 'Hủy trước 3 ngày',
      notes: 'Mang CMND',
      capacityInput: '20'
    });
    assert.deepEqual(clean, {
      isDetailsDirty: false,
      isCapacityDirty: false,
      hasAnyDirty: false,
      dirtyCount: 0
    });

    const bothDirty = getDirtyState({
      tour: baseTour,
      includedServices: ['Xe đưa đón', 'Hướng dẫn viên'],
      excludedServices: ['VAT'],
      cancellationPolicy: 'Hủy trước 3 ngày',
      notes: 'Mang CMND',
      capacityInput: '25'
    });
    assert.deepEqual(bothDirty, {
      isDetailsDirty: true,
      isCapacityDirty: true,
      hasAnyDirty: true,
      dirtyCount: 2
    });
  });

  it('validates non-negative integer capacity inputs', () => {
    assert.equal(validateCapacityInput('').valid, false);
    assert.equal(validateCapacityInput('-1').valid, false);
    assert.equal(validateCapacityInput('12.5').valid, false);
    assert.deepEqual(validateCapacityInput('0'), { valid: true, parsed: 0, error: '' });
    assert.deepEqual(validateCapacityInput('30'), { valid: true, parsed: 30, error: '' });
  });

  it('toggles only sections belonging to the active tab', () => {
    assert.equal(areAllVisibleSectionsOpen(INITIAL_OPEN_SECTIONS, 'content'), true);
    const collapsedContent = toggleVisibleSections(INITIAL_OPEN_SECTIONS, 'content');
    assert.equal(collapsedContent.itinerary, false);
    assert.equal(collapsedContent.services, false);
    assert.equal(collapsedContent.policies, false);
    // Sections on other tabs remain untouched
    assert.equal(collapsedContent.media, true);
    assert.equal(collapsedContent.departures, true);
    assert.equal(areAllVisibleSectionsOpen(collapsedContent, 'content'), false);

    const reopenedContent = toggleVisibleSections(collapsedContent, 'content');
    assert.equal(areAllVisibleSectionsOpen(reopenedContent, 'content'), true);
  });

  it('aborts unified save before API calls when capacity input is invalid', async () => {
    let called = false;
    const mockApi = {
      setDetails: async () => { called = true; },
      updateCapacity: async () => { called = true; }
    };
    const result = await executeUnifiedSave({
      tourId: 'tour-1',
      currentTour: { _id: 'tour-1' },
      dirtyState: { isDetailsDirty: true, isCapacityDirty: true, hasAnyDirty: true, dirtyCount: 2 },
      detailsPayload: { includedServices: ['A'] },
      capacityInput: '-5',
      tourApi: mockApi
    });
    assert.equal(called, false);
    assert.equal(result.didSave, false);
    assert.equal(result.errors.length, 1);
  });

  it('saves only dirty groups and handles partial failure cleanly', async () => {
    const calls = [];
    const mockApi = {
      setDetails: async (id, payload) => {
        calls.push(['setDetails', id, payload]);
        return {
          message: 'Saved details',
          data: { _id: id, ...payload, itinerary: [{ day: 1 }, { day: 2, isDeleted: true }] }
        };
      },
      updateCapacity: async () => {
        calls.push(['updateCapacity']);
        throw new Error('Số chỗ thấp hơn số đã đặt');
      }
    };

    const result = await executeUnifiedSave({
      tourId: 'tour-99',
      currentTour: { _id: 'tour-99', availableSeats: 20 },
      dirtyState: { isDetailsDirty: true, isCapacityDirty: true, hasAnyDirty: true, dirtyCount: 2 },
      detailsPayload: { includedServices: ['Bữa trưa'], excludedServices: [], cancellationPolicy: 'OK', notes: '' },
      capacityInput: '5',
      tourApi: mockApi
    });

    assert.equal(calls.length, 2);
    assert.equal(result.didSave, true);
    assert.equal(result.detailsSaved, true);
    assert.equal(result.capacitySaved, false);
    assert.deepEqual(result.updatedTour.itinerary, [{ day: 1 }]);
    assert.deepEqual(result.messages, ['Saved details']);
    assert.deepEqual(result.errors, ['Số chỗ thấp hơn số đã đặt']);
  });
});
