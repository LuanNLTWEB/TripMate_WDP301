/**
 * Itinerary Planning — các use case do Toan phụ trách
 *  - UC-48 View Personal Itinerary
 *  - UC-53 Add Activity to Itinerary (gồm detectScheduleConflicts – BR-62)
 *  - UC-120 Transfer Itinerary Ownership
 *  - UC-137 Leave Itinerary
 */
import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import Destination from '../models/Destination.js';
import Tour from '../models/Tour.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const destinationFields = 'name location images status';
const tourFields = 'title price images departureLocation destinationLocation location duration status';

/**
 * Detect overlapping activities within an itinerary (same date, time overlap).
 * @param {Object} itinerary
 * @returns {Array<{first:{_id,title,startTime,endTime}, second:{_id,title,startTime,endTime}}>}
 */
// START UC-53 Add Activity to Itinerary
/**
 * UC-53 – phát hiện trùng lịch giữa các hoạt động (BR-62).
 *
 * So từng cặp hoạt động (O(n^2) vì số hoạt động trong một lịch trình nhỏ):
 * hai hoạt động bị coi là trùng khi CÙNG NGÀY và các khoảng [startTime, endTime)
 * giao nhau.
 *
 * Phần phức tạp:
 *  - date lưu dạng Date nhưng startTime/endTime lưu dạng chuỗi "HH:mm"; vì cùng
 *    định dạng 24 giờ, so sánh chuỗi cho kết quả đúng thứ tự thời gian mà không
 *    phải parse lại thành Date.
 *  - toDateString() chuẩn hóa phần giờ của date, nên hai hoạt động khác giờ trong
 *    cùng một ngày vẫn được coi là cùng ngày.
 *  - Điều kiện giao nhau dùng dạng a.start < b.end && b.start < a.end (nửa mở),
 *    nhờ vậy hai hoạt động nối tiếp nhau (kết thúc = bắt đầu) KHÔNG bị báo trùng.
 *  - Chỉ trả về cặp id/tên/khung giờ, không trả cả document, để response nhẹ và
 *    không lộ dữ liệu chi phí của hoạt động.
 */
const timeToMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMin) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMin));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
};

const findSuggestedTimeSlot = (sameDayActivities, requestedStart, requestedEnd) => {
  const duration = Math.max(15, timeToMinutes(requestedEnd) - timeToMinutes(requestedStart));
  const sorted = [...sameDayActivities]
    .map((act) => ({ start: timeToMinutes(act.startTime), end: timeToMinutes(act.endTime) }))
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const interval of sorted) {
    if (!merged.length || merged[merged.length - 1].end < interval.start) {
      merged.push({ ...interval });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
    }
  }

  const reqStartMin = timeToMinutes(requestedStart);
  let candidateStart = reqStartMin;
  for (const block of merged) {
    if (candidateStart + duration <= block.start) {
      break;
    }
    if (candidateStart < block.end) {
      candidateStart = block.end;
    }
  }

  if (candidateStart + duration <= 23 * 60 + 59) {
    return {
      startTime: minutesToTime(candidateStart),
      endTime: minutesToTime(candidateStart + duration)
    };
  }

  let earlyCandidate = 6 * 60;
  for (const block of merged) {
    if (earlyCandidate + duration <= block.start) {
      return {
        startTime: minutesToTime(earlyCandidate),
        endTime: minutesToTime(earlyCandidate + duration)
      };
    }
    if (earlyCandidate < block.end) {
      earlyCandidate = block.end;
    }
  }

  return null;
};

const detectScheduleConflicts = (itinerary) => {
  const conflicts = [];
  const activities = itinerary.activities || [];
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i];
      const b = activities[j];
      const sameDate = new Date(a.date).toDateString() === new Date(b.date).toDateString();
      if (sameDate && a.startTime < b.endTime && b.startTime < a.endTime) {
        const overlapStart = a.startTime > b.startTime ? a.startTime : b.startTime;
        const overlapEnd = a.endTime < b.endTime ? a.endTime : b.endTime;
        const overlapMinutes = Math.max(0, timeToMinutes(overlapEnd) - timeToMinutes(overlapStart));
        conflicts.push({
          date: a.date,
          overlapStart,
          overlapEnd,
          overlapMinutes,
          first: { _id: a._id, title: a.title, startTime: a.startTime, endTime: a.endTime, location: a.location || '' },
          second: { _id: b._id, title: b.title, startTime: b.startTime, endTime: b.endTime, location: b.location || '' }
        });
      }
    }
  }
  return conflicts;
};

// END UC-53 Add Activity to Itinerary

/**
 * Return a plain-object itinerary with a computed `conflicts` field.
 */
const hydrateItinerary = (itinerary) => {
  const doc = itinerary.toObject ? itinerary.toObject() : itinerary;
  return { ...doc, conflicts: detectScheduleConflicts(doc) };
};

const canView = (itinerary, userId) => (
  String(itinerary.owner?._id || itinerary.owner) === String(userId)
  || itinerary.collaborators.some((c) => String(c.user?._id || c.user) === String(userId))
);

const canEdit = (itinerary, userId) => (
  String(itinerary.owner?._id || itinerary.owner) === String(userId)
  || itinerary.collaborators.some((c) => (
    String(c.user?._id || c.user) === String(userId) && c.permission === 'edit'
  ))
);

/**
 * Create a personal itinerary owned by the authenticated customer.
 * Guards against double-submit (same title from the same owner within 3 seconds).
 * @route POST /api/itineraries
 * @access Customer
 */
export const createItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const { title, budget, startDate, endDate } = req.body;
    const normalizedTitle = String(title).trim();

    const recentDuplicate = await Itinerary.findOne({
      owner: req.user._id,
      title: normalizedTitle,
      createdAt: { $gte: new Date(Date.now() - 3000) }
    });
    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Lịch trình tương tự vừa được tạo, vui lòng chờ trong giây lát'
      });
    }

    const itinerary = await Itinerary.create({
      title: normalizedTitle,
      budget,
      startDate,
      endDate,
      owner: req.user._id
    });

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create itinerary' });
  }
};

/**
 * Update an itinerary (owner or collaborator with edit permission).
 * @route PUT /api/itineraries/:id
 * @access Customer
 */
export const updateItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (!canEdit(itinerary, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa lịch trình này' });
    }

    const { title, budget, startDate, endDate } = req.body;

    if (title !== undefined) {
      itinerary.title = String(title).trim();
    }
    if (budget !== undefined) {
      itinerary.budget = budget === '' || budget === null ? 0 : Number(budget);
    }
    if (startDate !== undefined) {
      itinerary.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      itinerary.endDate = endDate ? new Date(endDate) : null;
    }

    if (itinerary.startDate && itinerary.endDate && itinerary.endDate < itinerary.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
      });
    }

    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật lịch trình thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Update itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật lịch trình' });
  }
};

const findAllPopulated = (filter) => Itinerary.find(filter)
  .populate('destinations', destinationFields)
  .populate('tours', tourFields)
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email')
  .populate('comments.user', 'username email');

const findByIdPopulated = (id) => Itinerary.findById(id)
  .populate('destinations', destinationFields)
  .populate('tours', tourFields)
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email')
  .populate('comments.user', 'username email');

/**
 * List personal itineraries owned by the authenticated customer.
 * @route GET /api/itineraries
 * @access Customer
 */
// START UC-48 View Personal Itinerary
/**
 * UC-48 – View Personal Itinerary (khách xem danh sách lịch trình của mình).
 *
 * Chỉ lấy lịch trình có owner là user đang đăng nhập (BR-67 – owner only), sắp
 * xếp theo updatedAt giảm dần, và map qua hydrateItinerary để mỗi item có sẵn
 * mảng conflicts (BR-62) cho UI cảnh báo trùng lịch ngay ở danh sách.
 */
export const listItineraries = async (req, res) => {
  try {
    const itineraries = await findAllPopulated({ owner: req.user._id }).sort({ updatedAt: -1 });
    return res.json({ success: true, itineraries: itineraries.map(hydrateItinerary) });
  } catch (error) {
    console.error('List itineraries error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itineraries' });
  }
};

// END UC-48 View Personal Itinerary

/**
 * Delete a personal itinerary (owner only).
 * @route DELETE /api/itineraries/:id
 * @access Customer (owner only)
 */
export const deleteItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || String(itinerary.owner) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình hoặc bạn không có quyền xóa' });
    }

    // BR-72 - Sole Ownership Rule: owner cannot delete while collaborators remain.
    // They must transfer ownership first, then the new owner can delete.
    if (itinerary.collaborators && itinerary.collaborators.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Lịch trình còn thành viên. Vui lòng chuyển quyền sở hữu trước khi xóa.'
      });
    }

    await Itinerary.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Đã xóa lịch trình' });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa lịch trình' });
  }
};

/**
 * List itineraries shared with the authenticated customer.
 * @route GET /api/itineraries/shared
 * @access Customer
 */
export const listSharedItineraries = async (req, res) => {
  try {
    const itineraries = await findAllPopulated({ 'collaborators.user': req.user._id }).sort({ updatedAt: -1 });
    return res.json({ success: true, itineraries: itineraries.map(hydrateItinerary) });
  } catch (error) {
    console.error('List shared itineraries error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load shared itineraries' });
  }
};

/**
 * View an owned or shared personal itinerary.
 * @route GET /api/itineraries/:id
 * @access Customer
 */
// START UC-48 View Personal Itinerary
/**
 * UC-48 – View Personal Itinerary (xem chi tiết một lịch trình).
 *
 * canView cho phép owner hoặc collaborator đã được chấp nhận (BR-69); người
 * không có quyền nhận 404 thay vì 403 để không lộ id lịch trình.
 * Kết quả được hydrate để kèm danh sách conflicts mới nhất.
 */
export const getItinerary = async (req, res) => {
  try {
    const itinerary = await findByIdPopulated(req.params.id);
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    return res.json({ success: true, itinerary: hydrateItinerary(itinerary) });
  } catch (error) {
    console.error('Get itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itinerary' });
  }
};

// END UC-48 View Personal Itinerary

/**
 * Calculate the trip budget of an itinerary: total cost = activity costs + tour prices.
 * @route GET /api/itineraries/:id/budget
 * @access Customer
 */
export const calculateTripBudget = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await findByIdPopulated(req.params.id);
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    const activityExpenses = (itinerary.activities || [])
      .reduce((sum, activity) => sum + (Number(activity.estimatedCost) || 0), 0);
    const tourExpenses = (itinerary.tours || [])
      .reduce((sum, tour) => sum + (Number(tour.price) || 0), 0);

    const budget = Number(itinerary.budget) || 0;
    const totalCost = activityExpenses + tourExpenses;
    const remainingAmount = budget - totalCost;

    return res.json({
      success: true,
      budget,
      totalCost,
      breakdown: {
        totalBudget: budget,
        tourExpenses,
        activityExpenses,
        remainingAmount,
        isOverBudget: totalCost > budget
      }
    });
  } catch (error) {
    console.error('Calculate trip budget error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tính toán ngân sách chuyến đi' });
  }
};

/**
 * Return detected schedule conflicts for an itinerary.
 * @route GET /api/itineraries/:id/conflicts
 * @access Customer
 */
// START UC-53 Add Activity to Itinerary
/**
 * UC-53 – trả về danh sách trùng lịch hiện tại của một lịch trình.
 *
 * Dùng chung detectScheduleConflicts với addActivity, nhưng trả riêng để UI có
 * thể refresh cảnh báo mà không phải tải lại toàn bộ lịch trình.
 */
export const getActivityConflicts = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    const conflicts = detectScheduleConflicts(itinerary);
    return res.json({
      success: true,
      hasConflict: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflicts
    });
  } catch (error) {
    console.error('Get itinerary conflicts error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itinerary conflicts' });
  }
};

// END UC-53 Add Activity to Itinerary

// START UC-58 Check Time Conflict
/**
 * UC-58 – Check Time Conflict (kiểm tra trùng giờ cho một khung thời gian dự kiến
 * và gợi ý khung giờ trống tiếp theo trong ngày – BR-62).
 *
 * @route POST /api/itineraries/:id/conflicts/check
 * @access Customer (owner hoặc collaborator)
 */
export const checkTimeConflict = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    const { date, startTime, endTime, excludeActivityId } = req.body;
    if (endTime <= startTime) {
      return res.status(400).json({ success: false, message: 'Giờ kết thúc phải sau giờ bắt đầu' });
    }

    const targetDateStr = new Date(date).toDateString();
    const sameDayActivities = (itinerary.activities || []).filter((act) => {
      if (excludeActivityId && String(act._id) === String(excludeActivityId)) {
        return false;
      }
      return new Date(act.date).toDateString() === targetDateStr;
    });

    const conflictingActivities = sameDayActivities
      .filter((act) => startTime < act.endTime && act.startTime < endTime)
      .map((act) => {
        const overlapStart = startTime > act.startTime ? startTime : act.startTime;
        const overlapEnd = endTime < act.endTime ? endTime : act.endTime;
        const overlapMinutes = Math.max(0, timeToMinutes(overlapEnd) - timeToMinutes(overlapStart));
        return {
          _id: act._id,
          title: act.title,
          location: act.location || '',
          date: act.date,
          startTime: act.startTime,
          endTime: act.endTime,
          overlapStart,
          overlapEnd,
          overlapMinutes
        };
      });

    const hasConflict = conflictingActivities.length > 0;
    const suggestedSlot = hasConflict
      ? findSuggestedTimeSlot(sameDayActivities, startTime, endTime)
      : null;

    return res.json({
      success: true,
      hasConflict,
      conflictCount: conflictingActivities.length,
      conflictingActivities,
      suggestedSlot
    });
  } catch (error) {
    console.error('Check time conflict error:', error);
    return res.status(500).json({ success: false, message: 'Không thể kiểm tra trùng giờ' });
  }
};
// END UC-58 Check Time Conflict

/**
 * Add an activity to an owned or edit-enabled shared itinerary.
 * @route POST /api/itineraries/:id/activities
 * @access Customer
 */
// START UC-53 Add Activity to Itinerary
/**
 * UC-53 – Add Activity to Itinerary (thêm hoạt động vào lịch trình).
 *
 * Luồng: validate -> tìm lịch trình + kiểm tra quyền sửa -> kiểm tra giờ hợp lệ
 * -> push hoạt động -> lưu -> trả lại lịch trình đã populate kèm conflicts.
 *
 * Phần phức tạp:
 *  - canEdit: owner luôn được sửa, collaborator chỉ khi permission = 'edit'
 *    (BR-69); người chỉ xem không thêm được hoạt động.
 *  - Chặn endTime <= startTime ngay tại server vì UI có thể bị bỏ qua.
 *  - Sau khi lưu phải đọc lại bằng findByIdPopulated rồi hydrate, nhờ vậy
 *    conflicts trong response đã tính cả hoạt động vừa thêm (BR-62).
 */
export const addActivity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Editable itinerary not found' });
    }

    if (req.body.endTime <= req.body.startTime) {
      return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    itinerary.activities.push(req.body);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({ success: true, itinerary: hydrateItinerary(populated) });
  } catch (error) {
    console.error('Add itinerary activity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to add activity' });
  }
};

// END UC-53 Add Activity to Itinerary

/**
 * Reorder activities in an owned or edit-enabled shared itinerary.
 * @route PUT /api/itineraries/:id/activities/reorder
 * @access Customer
 */
export const reorderActivities = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const requestIds = req.body.activities.map(String);
    const currentIds = itinerary.activities.map((a) => String(a._id));

    if (requestIds.length !== currentIds.length) {
      return res.status(400).json({ success: false, message: 'Danh sách hoạt động không hợp lệ' });
    }

    const hasDuplicate = new Set(requestIds).size !== requestIds.length;
    if (hasDuplicate) {
      return res.status(400).json({ success: false, message: 'Không được trùng lặp hoạt động' });
    }

    const allExist = requestIds.every((id) => currentIds.includes(id));
    if (!allExist) {
      return res.status(400).json({ success: false, message: 'Hoạt động không thuộc lịch trình' });
    }

    const activityMap = new Map(itinerary.activities.map((a) => [String(a._id), a]));
    itinerary.activities = requestIds.map((id) => activityMap.get(id));
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã sắp xếp lại hoạt động',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Reorder activities error:', error);
    return res.status(500).json({ success: false, message: 'Không thể sắp xếp lại hoạt động' });
  }
};

/**
 * Remove an activity from an owned or edit-enabled shared itinerary.
 * @route DELETE /api/itineraries/:id/activities/:activityId
 * @access Customer
 */
export const removeActivity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const activity = itinerary.activities.id(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hoạt động trong lịch trình' });
    }

    itinerary.activities.pull(req.params.activityId);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã xóa hoạt động khỏi lịch trình',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Remove itinerary activity error:', error);
    return res.status(500).json({ success: false, message: 'Unable to remove activity' });
  }
};

/**
 * Update an activity in an owned or edit-enabled shared itinerary.
 * @route PUT /api/itineraries/:id/activities/:activityId
 * @access Customer
 */
export const updateActivity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const activity = itinerary.activities.id(req.params.activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hoạt động trong lịch trình' });
    }

    const newStart = req.body.startTime !== undefined ? req.body.startTime : activity.startTime;
    const newEnd = req.body.endTime !== undefined ? req.body.endTime : activity.endTime;
    if (newEnd <= newStart) {
      return res.status(400).json({ success: false, message: 'Giờ kết thúc phải sau giờ bắt đầu' });
    }

    if (req.body.title !== undefined) activity.title = req.body.title.trim();
    if (req.body.date !== undefined) activity.date = req.body.date;
    if (req.body.startTime !== undefined) activity.startTime = req.body.startTime;
    if (req.body.endTime !== undefined) activity.endTime = req.body.endTime;
    if (req.body.location !== undefined) activity.location = req.body.location ? req.body.location.trim() : '';
    if (req.body.estimatedCost !== undefined) {
      activity.estimatedCost = req.body.estimatedCost === '' || req.body.estimatedCost === null ? 0 : Number(req.body.estimatedCost);
    }
    if (req.body.notes !== undefined) activity.notes = req.body.notes ? req.body.notes.trim() : '';

    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã cập nhật hoạt động thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Update itinerary activity error:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật hoạt động' });
  }
};

/**
 * Add an active destination to an owned or edit-enabled shared itinerary.
 * @route POST /api/itineraries/:id/destinations
 * @access Customer
 */
export const addDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const destination = await Destination.findOne({
      _id: req.body.destinationId,
      status: 'active',
      isDeleted: { $ne: true }
    });
    if (!destination) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy điểm đến đang hoạt động' });
    }

    const alreadyAdded = itinerary.destinations.some(
      (destinationId) => destinationId.equals(destination._id)
    );
    if (alreadyAdded) {
      return res.status(400).json({ success: false, message: 'Điểm đến đã có trong lịch trình' });
    }

    itinerary.destinations.push(destination._id);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({
      success: true,
      message: 'Đã thêm điểm đến vào lịch trình',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Add itinerary destination error:', error);
    return res.status(500).json({ success: false, message: 'Không thể thêm điểm đến vào lịch trình' });
  }
};

/**
 * Remove a destination from an owned or edit-enabled shared itinerary.
 * @route DELETE /api/itineraries/:id/destinations/:destinationId
 * @access Customer
 */
export const removeDestination = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const destinationId = req.params.destinationId;
    const destinationIndex = itinerary.destinations.findIndex(
      (id) => id.equals(destinationId)
    );

    if (destinationIndex === -1) {
      return res.status(404).json({ success: false, message: 'Điểm đến không có trong lịch trình' });
    }

    itinerary.destinations.splice(destinationIndex, 1);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã xóa điểm đến khỏi lịch trình',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Remove itinerary destination error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa điểm đến khỏi lịch trình' });
  }
};

/**
 * Add an active tour to an owned itinerary (owner only).
 * @route POST /api/itineraries/:id/tours
 * @access Customer (owner only)
 */
export const addTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || String(itinerary.owner) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình hoặc bạn không có quyền chỉnh sửa' });
    }

    const tour = await Tour.findOne({ _id: req.body.tourId, status: 'active', isDeleted: { $ne: true } });
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tour đang hoạt động' });
    }

    if (!itinerary.tours) itinerary.tours = [];

    const alreadyAdded = itinerary.tours.some((tourId) => tourId.equals(tour._id));
    if (alreadyAdded) {
      return res.status(400).json({ success: false, message: 'Tour đã có trong lịch trình' });
    }

    itinerary.tours.push(tour._id);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({
      success: true,
      message: 'Đã thêm tour vào lịch trình',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Add tour to itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể thêm tour vào lịch trình' });
  }
};

/**
 * Remove a tour from an owned itinerary (owner only).
 * @route DELETE /api/itineraries/:id/tours/:tourId
 * @access Customer (owner only)
 */
export const removeTour = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || String(itinerary.owner) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình hoặc bạn không có quyền chỉnh sửa' });
    }

    if (!itinerary.tours) itinerary.tours = [];

    const tourIndex = itinerary.tours.findIndex((id) => id.equals(req.params.tourId));
    if (tourIndex === -1) {
      return res.status(404).json({ success: false, message: 'Tour không có trong lịch trình' });
    }

    itinerary.tours.splice(tourIndex, 1);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã xóa tour khỏi lịch trình',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Remove tour from itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa tour khỏi lịch trình' });
  }
};

// START UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account (BR-73)
/**
 * Duplicate an owned or shared itinerary into a new personal itinerary.
 * Creates an independent record owned by the current user, stripping collaborators and comments.
 * Supports customizable title and optional proportional date shift based on new startDate.
 * @route POST /api/itineraries/:id/duplicate
 * @access Customer
 */
export const duplicateItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const source = await Itinerary.findById(req.params.id);
    if (!source || !canView(source, req.user._id)) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình hoặc bạn không có quyền sao chép'
      });
    }

    const customTitle = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const newTitle = customTitle || `${source.title} (Bản sao)`;

    let newStartDate = source.startDate;
    let newEndDate = source.endDate;
    let dateShiftMs = 0;

    if (req.body.startDate) {
      const parsedStart = new Date(req.body.startDate);
      if (!isNaN(parsedStart.getTime())) {
        if (source.startDate) {
          const originalStart = new Date(source.startDate);
          dateShiftMs = parsedStart.getTime() - originalStart.getTime();
          newStartDate = parsedStart;
          if (source.endDate) {
            newEndDate = new Date(new Date(source.endDate).getTime() + dateShiftMs);
          }
        } else {
          newStartDate = parsedStart;
        }
      }
    }

    const duplicated = await Itinerary.create({
      owner: req.user._id,
      title: newTitle.slice(0, 120),
      startDate: newStartDate,
      endDate: newEndDate,
      budget: source.budget || 0,
      destinations: [...(source.destinations || [])],
      tours: [...(source.tours || [])],
      activities: (source.activities || []).map((activity) => {
        let activityDate = activity.date;
        if (dateShiftMs !== 0 && activity.date) {
          activityDate = new Date(new Date(activity.date).getTime() + dateShiftMs);
        }
        return {
          title: activity.title,
          date: activityDate,
          startTime: activity.startTime,
          endTime: activity.endTime,
          location: activity.location || '',
          estimatedCost: activity.estimatedCost || 0,
          notes: activity.notes || ''
        };
      }),
      packingItems: (source.packingItems || []).map((item) => ({
        name: item.name,
        isPacked: false
      })),
      collaborators: [],
      comments: []
    });

    const populated = await findByIdPopulated(duplicated._id);
    return res.status(201).json({
      success: true,
      message: 'Đã lưu lịch trình vào tài khoản thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Duplicate itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể sao chép lịch trình' });
  }
};
// END UC-62 Duplicate Itinerary / Save Shared Itinerary to My Account

/**
 * Share a personal itinerary with another user via email (owner only).
 * @route POST /api/itineraries/:id/share
 * @access Customer (owner only)
 */
export const shareItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const { email, permission } = req.body;
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (String(itinerary.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chia sẻ lịch trình này' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const targetUser = await User.findOne({ email: normalizedEmail, isDeleted: { $ne: true } });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng với email này' });
    }

    if (String(targetUser._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Không thể tự chia sẻ lịch trình cho chính mình' });
    }

    if (!itinerary.collaborators) {
      itinerary.collaborators = [];
    }

    const existingIndex = itinerary.collaborators.findIndex(
      (c) => String(c.user?._id || c.user) === String(targetUser._id)
    );

    if (existingIndex !== -1) {
      itinerary.collaborators[existingIndex].permission = permission;
    } else {
      itinerary.collaborators.push({
        user: targetUser._id,
        permission
      });
    }

    await itinerary.save();
    const populated = await findByIdPopulated(itinerary._id);

    try {
      const ownerName = req.user.username || req.user.email || 'Một người dùng';
      const permText = permission === 'edit' ? 'chỉnh sửa' : 'chỉ xem';
      await Notification.create({
        recipient: targetUser._id,
        sender: req.user._id,
        itinerary: itinerary._id,
        permission,
        title: 'Bạn được chia sẻ một lịch trình',
        message: `${ownerName} đã chia sẻ lịch trình "${itinerary.title}" với bạn với quyền ${permText}.`,
        notificationType: 'itinerary_share'
      });
    } catch (notifErr) {
      console.warn('Could not dispatch share notification:', notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Đã chia sẻ lịch trình với ${targetUser.username || targetUser.email}`,
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Share itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể chia sẻ lịch trình' });
  }
};

/**
 * Leave a shared itinerary that the authenticated customer collaborates on.
 * The owner keeps ownership and uses removeCollaborator instead.
 * @route DELETE /api/itineraries/:id/leave
 * @access Customer (collaborator only)
 */
// START UC-137 Leave Itinerary
/**
 * UC-137 – Leave Itinerary (collaborator tự rời lịch trình được chia sẻ).
 *
 * Phần phức tạp:
 *  - BR-72 Sole Ownership: owner không được "rời" — phải chuyển quyền hoặc xóa
 *    lịch trình; response kèm reason 'owner_must_transfer_or_delete' để UI mở
 *    đúng luồng chuyển quyền.
 *  - Tìm collaborator theo cả hai dạng c.user (ObjectId thô hoặc đã populate)
 *    rồi splice theo index, thay vì filter, để giữ nguyên các phần tử khác.
 *  - markModified('collaborators') là bắt buộc vì mảng con bị sửa tại chỗ, nếu
 *    không Mongoose sẽ không phát hiện thay đổi.
 *  - Sau khi rời, gửi thông báo (Notification.insertMany) cho các thành viên còn
 *    lại; người rời lấy tên từ token nên không cần populate.
 */
export const leaveItinerary = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    try {
      const itinerary = await Itinerary.findById(req.params.id);

      if (!itinerary) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch trình'
        });
      }

      const currentUserId = String(req.user._id);

      // BR-72 - Sole Ownership Rule: owner cannot leave without transferring
      // ownership first. They must use the separate transfer ownership flow,
      // or delete the entire itinerary.
      if (String(itinerary.owner?._id || itinerary.owner) === currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Chủ sở hữu không thể tự rời khỏi lịch trình. Vui lòng chuyển quyền sở hữu cho một thành viên khác trước (sử dụng chức năng chuyển quyền sở hữu), hoặc xóa toàn bộ lịch trình.',
          reason: 'owner_must_transfer_or_delete'
        });
      }

      const collaborators = Array.isArray(itinerary.collaborators) ? itinerary.collaborators : [];
      const index = collaborators.findIndex(
        (c) => String(c.user?._id || c.user) === currentUserId
      );

      if (index === -1) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là thành viên của lịch trình này'
        });
      }

      collaborators.splice(index, 1);
      itinerary.collaborators = collaborators;
      itinerary.markModified('collaborators');
      await itinerary.save();

      // the leaver is the authenticated user; collaborators are raw ObjectIds here
      // because the itinerary was not populated
      const leaverName = req.user.username || req.user.email || 'Một thành viên';
      const remainingRecipients = collaborators
        .map((c) => c.user?._id || c.user)
        .filter(Boolean);

      if (remainingRecipients.length > 0) {
        await Notification.insertMany(remainingRecipients.map((recipient) => ({
          recipient,
          title: 'Có thành viên rời khỏi lịch trình',
          message: leaverName + ' đã rời khỏi lịch trình "' + itinerary.title + '".',
          notificationType: 'itinerary_leave',
          itinerary: itinerary._id
        })));
      }

      return res.status(200).json({
        success: true,
        message: 'Bạn đã rời khỏi lịch trình',
        data: {
          _id: itinerary._id,
          collaboratorCount: collaborators.length
        }
      });
    } catch (error) {
      console.error('Leave itinerary error:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể rời khỏi lịch trình'
      });
    }
  };

// END UC-137 Leave Itinerary

export const removeCollaborator = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (String(itinerary.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý người tham gia lịch trình này' });
    }

    if (!itinerary.collaborators) {
      itinerary.collaborators = [];
    }

    itinerary.collaborators = itinerary.collaborators.filter(
      (c) => String(c.user?._id || c.user) !== String(req.params.userId)
    );

    await itinerary.save();
    const populated = await findByIdPopulated(itinerary._id);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa quyền cộng tác viên',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa cộng tác viên' });
  }
};


/**
 * Chuyển quyền sở hữu lịch trình cho một cộng tác viên (BR-72)
 * @route PUT /api/itineraries/:id/owner
 * @access Customer (owner only)
 */
// START UC-120 Transfer Itinerary Ownership
/**
 * UC-120 – Transfer Itinerary Ownership (owner chuyển quyền sở hữu – BR-72).
 *
 * Phần phức tạp:
 *  - Chỉ owner hiện tại được chuyển quyền; người nhận phải đang là collaborator,
 *    nếu không trả 400 kèm eligibleOwners để UI hiện danh sách chọn hợp lệ.
 *  - Hoán đổi vai trò trong một lần lưu: owner mới bị bỏ khỏi collaborators,
 *    owner cũ được push lại với permission 'edit' — nhờ vậy lịch trình luôn có
 *    đúng một owner và không mất quyền của người chuyển.
 *  - markModified('collaborators') vì mảng bị thay đổi tại chỗ.
 *  - Thông báo chỉ gửi cho các thành viên còn lại (trừ owner mới) để tránh tự
 *    thông báo cho chính người vừa nhận quyền.
 */
export const transferOwnership = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (String(itinerary.owner?._id || itinerary.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chuyển quyền sở hữu lịch trình này' });
    }

    if (!itinerary.collaborators) {
      itinerary.collaborators = [];
    }

    const newOwnerId = req.body.newOwnerId;
    const newOwnerCollab = itinerary.collaborators.find(
      (c) => String(c.user?._id || c.user) === String(newOwnerId)
    );

    if (!newOwnerCollab) {
      return res.status(400).json({
        success: false,
        message: 'Người được chọn không phải là thành viên của lịch trình',
        eligibleOwners: itinerary.collaborators.map((c) => ({
          _id: String(c.user?._id || c.user),
          username: c.user?.username || null,
          email: c.user?.email || null,
          permission: c.permission
        }))
      });
    }

    // Transfer: collaborator becomes owner, old owner becomes collaborator (edit)
    const oldOwnerId = itinerary.owner;
    itinerary.owner = newOwnerId;
    itinerary.collaborators = itinerary.collaborators.filter(
      (c) => String(c.user?._id || c.user) !== String(newOwnerId)
    );
    // Old owner becomes a collaborator with edit permission
    itinerary.collaborators.push({
      user: oldOwnerId,
      permission: 'edit'
    });
    itinerary.markModified('collaborators');
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);

    // Notify all collaborators about the ownership transfer
    const recipients = itinerary.collaborators
      .map((c) => c.user?._id || c.user)
      .filter((id) => String(id) !== String(newOwnerId));
    if (recipients.length > 0) {
      await Notification.insertMany(recipients.map((recipient) => ({
        recipient,
        title: 'Quyền sở hữu lịch trình đã chuyển',
        message: (req.user.username || req.user.email) + ' đã chuyển quyền sở hữu lịch trình "' + itinerary.title + '" cho ' + (newOwnerCollab.user?.username || newOwnerCollab.user?.email || 'thành viên khác') + '.',
        notificationType: 'itinerary_transfer',
        itinerary: itinerary._id
      })));
    }

    return res.status(200).json({
      success: true,
      message: 'Chuyển quyền sở hữu thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    return res.status(500).json({ success: false, message: 'Không thể chuyển quyền sở hữu lịch trình' });
  }
};

// END UC-120 Transfer Itinerary Ownership

/**
 * UC-61: Comment on Itinerary
 * Post a comment on an itinerary (owner or any accepted collaborator).
 * BR-74: Collaborators with read-only ("view") permission can still post comments.
 * @route POST /api/itineraries/:id/comments
 * @access Customer
 */
export const addComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Nội dung bình luận không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    if (!canView(itinerary, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tham gia thảo luận trong lịch trình này'
      });
    }

    const content = String(req.body.content || '').trim();
    if (!content || content.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung bình luận không được để trống và không vượt quá 500 ký tự'
      });
    }

    itinerary.comments.push({
      user: req.user._id,
      content,
      createdAt: new Date()
    });

    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(201).json({
      success: true,
      message: 'Đã gửi bình luận thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Add itinerary comment error:', error);
    return res.status(500).json({ success: false, message: 'Không thể gửi bình luận' });
  }
};

/**
 * UC-61: Delete Comment on Itinerary
 * Delete a comment (author of the comment or owner of the itinerary).
 * @route DELETE /api/itineraries/:id/comments/:commentId
 * @access Customer
 */
export const deleteComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Mã bình luận không hợp lệ',
      errors: errors.array()
    });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình' });
    }

    const comment = itinerary.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
    }

    const isItineraryOwner = String(itinerary.owner) === String(req.user._id);
    const isCommentAuthor = String(comment.user) === String(req.user._id);

    if (!isItineraryOwner && !isCommentAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa bình luận này'
      });
    }

    itinerary.comments.pull(req.params.commentId);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.status(200).json({
      success: true,
      message: 'Đã xóa bình luận thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Delete itinerary comment error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa bình luận' });
  }
};


/**
 * Update a packing item in an owned or edit-enabled shared itinerary.
 * @route PUT /api/itineraries/:id/packing-items/:itemId
 * @access Customer
 */
export const updatePackingItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const item = itinerary.packingItems.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vật dụng trong danh sách hành lý' });
    }

    item.name = req.body.name.trim();
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã cập nhật vật dụng thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Update packing item error:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật vật dụng' });
  }
};

/**
 * Remove a packing item from an owned or edit-enabled shared itinerary.
 * @route DELETE /api/itineraries/:id/packing-items/:itemId
 * @access Customer
 */
export const removePackingItem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canEdit(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình có thể chỉnh sửa' });
    }

    const item = itinerary.packingItems.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vật dụng trong danh sách hành lý' });
    }

    itinerary.packingItems.pull(req.params.itemId);
    await itinerary.save();

    const populated = await findByIdPopulated(itinerary._id);
    return res.json({
      success: true,
      message: 'Đã xóa vật dụng khỏi danh sách hành lý',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Remove packing item error:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa vật dụng' });
  }
};
