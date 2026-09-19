import { validationResult } from 'express-validator';
import Itinerary from '../models/Itinerary.js';
import Destination from '../models/Destination.js';
import Tour from '../models/Tour.js';

const destinationFields = 'name location images status';
const tourFields = 'title price images departureLocation destinationLocation location duration status';

/**
 * Detect overlapping activities within an itinerary (same date, time overlap).
 * @param {Object} itinerary
 * @returns {Array<{first:{_id,title,startTime,endTime}, second:{_id,title,startTime,endTime}}>}
 */
const detectScheduleConflicts = (itinerary) => {
  const conflicts = [];
  const activities = itinerary.activities || [];
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i];
      const b = activities[j];
      const sameDate = new Date(a.date).toDateString() === new Date(b.date).toDateString();
      if (sameDate && a.startTime < b.endTime && b.startTime < a.endTime) {
        conflicts.push({
          first: { _id: a._id, title: a.title, startTime: a.startTime, endTime: a.endTime },
          second: { _id: b._id, title: b.title, startTime: b.startTime, endTime: b.endTime }
        });
      }
    }
  }
  return conflicts;
};

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
 * Create an empty personal itinerary owned by the authenticated customer.
 * @route POST /api/itineraries
 * @access Customer
 */
export const createItinerary = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  try {
    const itinerary = await Itinerary.create({ ...req.body, owner: req.user._id });
    return res.status(201).json({ success: true, itinerary });
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create itinerary' });
  }
};

const findAllPopulated = (filter) => Itinerary.find(filter)
  .populate('destinations', destinationFields)
  .populate('tours', tourFields)
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email');

const findByIdPopulated = (id) => Itinerary.findById(id)
  .populate('destinations', destinationFields)
  .populate('tours', tourFields)
  .populate('owner', 'username email')
  .populate('collaborators.user', 'username email');

/**
 * List personal itineraries owned by the authenticated customer.
 * @route GET /api/itineraries
 * @access Customer
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

/**
 * Return detected schedule conflicts for an itinerary.
 * @route GET /api/itineraries/:id/conflicts
 * @access Customer
 */
export const getActivityConflicts = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary || !canView(itinerary, req.user._id)) {
      return res.status(404).json({ success: false, message: 'Itinerary not found' });
    }
    return res.json({ success: true, conflicts: detectScheduleConflicts(itinerary) });
  } catch (error) {
    console.error('Get itinerary conflicts error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load itinerary conflicts' });
  }
};

/**
 * Add an activity to an owned or edit-enabled shared itinerary.
 * @route POST /api/itineraries/:id/activities
 * @access Customer
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
      status: { $ne: 'inactive' },
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

    const tour = await Tour.findOne({ _id: req.body.tourId, status: { $ne: 'suspended' } });
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

/**
 * Duplicate an owned or shared itinerary into a new personal itinerary.
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

    const duplicated = await Itinerary.create({
      owner: req.user._id,
      title: newTitle.slice(0, 120),
      startDate: source.startDate,
      endDate: source.endDate,
      budget: source.budget || 0,
      destinations: [...(source.destinations || [])],
      tours: [...(source.tours || [])],
      activities: (source.activities || []).map((activity) => ({
        title: activity.title,
        date: activity.date,
        startTime: activity.startTime,
        endTime: activity.endTime,
        location: activity.location || '',
        estimatedCost: activity.estimatedCost || 0,
        notes: activity.notes || ''
      })),
      collaborators: []
    });

    const populated = await findByIdPopulated(duplicated._id);
    return res.status(201).json({
      success: true,
      message: 'Đã nhân bản lịch trình thành công',
      itinerary: hydrateItinerary(populated)
    });
  } catch (error) {
    console.error('Duplicate itinerary error:', error);
    return res.status(500).json({ success: false, message: 'Không thể sao chép lịch trình' });
  }
};

