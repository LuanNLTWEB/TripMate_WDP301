/**
 * Pure helper utilities for ProviderTourDetails layout, tab/accordion state,
 * dirty-change tracking, and unified saving.
 */

export const TOUR_DETAIL_TABS = [
  { id: 'overview', label: 'Tổng quan & Hình ảnh', icon: 'bi-grid-1x2' },
  { id: 'content', label: 'Nội dung & Dịch vụ', icon: 'bi-journal-richtext' },
  { id: 'operations', label: 'Vận hành & Khởi hành', icon: 'bi-calendar2-week' },
  { id: 'all', label: 'Xem tất cả', icon: 'bi-layers' }
];

export const INITIAL_OPEN_SECTIONS = {
  media: true,
  metadata: true,
  itinerary: true,
  services: true,
  policies: true,
  capacity: true,
  departures: true
};

export const TAB_SECTION_MAP = {
  overview: ['media', 'metadata'],
  content: ['itinerary', 'services', 'policies'],
  operations: ['capacity', 'departures'],
  all: ['media', 'metadata', 'itinerary', 'services', 'policies', 'capacity', 'departures']
};

const TOUR_STATUS_META = {
  suspended: { statusClass: 'is-suspended', statusLabel: 'Tạm ngưng' },
  pending: { statusClass: 'is-pending', statusLabel: 'Chờ kiểm duyệt' },
  needs_revision: { statusClass: 'is-revision', statusLabel: 'Cần chỉnh sửa' },
  rejected: { statusClass: 'is-rejected', statusLabel: 'Bị từ chối' },
  active: { statusClass: 'is-active', statusLabel: 'Đang hoạt động' }
};

/**
 * Returns CSS status modifier class and Vietnamese label for a tour status.
 */
export function getTourStatusMeta(status) {
  return TOUR_STATUS_META[status] || TOUR_STATUS_META.active;
}

/**
 * Resolves display name for a populated or raw tour category reference.
 */
export function getTourCategoryName(categoryId) {
  if (categoryId && typeof categoryId === 'object') {
    return categoryId.name || '—';
  }
  return categoryId || '—';
}

/**
 * Normalizes a tour response so soft-deleted itinerary days never leak into view.
 */
export function normalizeTourRecord(data) {
  if (!data || typeof data !== 'object') return data;
  if (!Array.isArray(data.itinerary)) return data;
  return {
    ...data,
    itinerary: data.itinerary.filter((item) => !item?.isDeleted)
  };
}

/**
 * Checks whether two string arrays contain identical elements in the same order.
 */
export function areStringArraysEqual(first, second) {
  const a = Array.isArray(first) ? first : [];
  const b = Array.isArray(second) ? second : [];
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

/**
 * Computes independent dirty flags for details (services/policy/notes) and capacity.
 */
export function getDirtyState({
  tour,
  includedServices,
  excludedServices,
  cancellationPolicy,
  notes,
  capacityInput
}) {
  if (!tour) {
    return {
      isDetailsDirty: false,
      isCapacityDirty: false,
      hasAnyDirty: false,
      dirtyCount: 0
    };
  }

  const savedIncluded = tour.includedServices || [];
  const savedExcluded = tour.excludedServices || [];
  const savedPolicy = tour.cancellationPolicy || '';
  const savedNotes = tour.notes || '';
  const savedSeats = String(tour.availableSeats ?? 0);

  const isDetailsDirty =
    !areStringArraysEqual(includedServices, savedIncluded) ||
    !areStringArraysEqual(excludedServices, savedExcluded) ||
    String(cancellationPolicy ?? '') !== savedPolicy ||
    String(notes ?? '') !== savedNotes;

  const isCapacityDirty = String(capacityInput ?? '').trim() !== savedSeats;
  const dirtyCount = (isDetailsDirty ? 1 : 0) + (isCapacityDirty ? 1 : 0);

  return {
    isDetailsDirty,
    isCapacityDirty,
    hasAnyDirty: dirtyCount > 0,
    dirtyCount
  };
}

/**
 * Validates tour seat capacity input (must be non-negative integer).
 */
export function validateCapacityInput(rawValue) {
  const text = String(rawValue ?? '').trim();
  if (!text) {
    return { valid: false, parsed: null, error: 'Số chỗ phải là số nguyên không âm.' };
  }
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { valid: false, parsed: null, error: 'Số chỗ phải là số nguyên không âm.' };
  }
  return { valid: true, parsed, error: '' };
}

/**
 * Lists collapsible section keys currently visible under the given tab.
 */
export function getVisibleSectionKeys(tabKey) {
  return TAB_SECTION_MAP[tabKey] || TAB_SECTION_MAP.overview;
}

/**
 * Returns true if every section visible in the current tab is expanded.
 */
export function areAllVisibleSectionsOpen(openSections, tabKey) {
  const keys = getVisibleSectionKeys(tabKey);
  return keys.every((key) => Boolean(openSections?.[key]));
}

/**
 * Toggles all sections visible in the active tab open or closed together.
 */
export function toggleVisibleSections(openSections, tabKey) {
  const keys = getVisibleSectionKeys(tabKey);
  const nextOpen = !areAllVisibleSectionsOpen(openSections, tabKey);
  const nextState = { ...openSections };
  keys.forEach((key) => {
    nextState[key] = nextOpen;
  });
  return nextState;
}

/**
 * Orchestrates saving only modified sections (details and/or capacity) cleanly.
 * Validates capacity upfront so no partial write occurs on bad local input.
 */
export async function executeUnifiedSave({
  tourId,
  currentTour,
  dirtyState,
  detailsPayload,
  capacityInput,
  tourApi
}) {
  if (!dirtyState?.hasAnyDirty) {
    return {
      didSave: false,
      detailsSaved: false,
      capacitySaved: false,
      updatedTour: currentTour,
      confirmedSeats: null,
      messages: [],
      errors: []
    };
  }

  let parsedCapacity = null;
  if (dirtyState.isCapacityDirty) {
    const validation = validateCapacityInput(capacityInput);
    if (!validation.valid) {
      return {
        didSave: false,
        detailsSaved: false,
        capacitySaved: false,
        updatedTour: currentTour,
        confirmedSeats: null,
        messages: [],
        errors: [validation.error]
      };
    }
    parsedCapacity = validation.parsed;
  }

  let nextTour = currentTour;
  let detailsSaved = false;
  let capacitySaved = false;
  let confirmedSeats = null;
  const messages = [];
  const errors = [];

  if (dirtyState.isDetailsDirty) {
    try {
      const res = await tourApi.setDetails(tourId, detailsPayload);
      if (res?.data) {
        nextTour = normalizeTourRecord(res.data);
      }
      detailsSaved = true;
      messages.push(res?.message || 'Đã lưu dịch vụ & chính sách tour.');
    } catch (err) {
      errors.push(err?.message || 'Không thể lưu thiết lập chi tiết tour.');
    }
  }

  if (dirtyState.isCapacityDirty) {
    try {
      const res = await tourApi.updateCapacity(tourId, parsedCapacity);
      const nextSeats = res?.data?.availableSeats ?? parsedCapacity;
      confirmedSeats = res?.data?.confirmedSeats ?? 0;
      nextTour = nextTour ? { ...nextTour, availableSeats: nextSeats } : nextTour;
      capacitySaved = true;
      messages.push(res?.message || 'Cập nhật số chỗ thành công!');
    } catch (err) {
      errors.push(err?.message || 'Không thể cập nhật số chỗ tour.');
    }
  }

  return {
    didSave: detailsSaved || capacitySaved,
    detailsSaved,
    capacitySaved,
    updatedTour: nextTour,
    confirmedSeats,
    messages,
    errors
  };
}
