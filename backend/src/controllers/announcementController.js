import { validationResult } from 'express-validator';
import Announcement from '../models/Announcement.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sendValidationError = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: errors.array()
  });
  return true;
};

const getPagination = (query) => ({
  page: Math.max(Number(query.page) || 1, 1),
  limit: Math.min(Math.max(Number(query.limit) || 10, 1), 50)
});

const appendSearch = (filter, search) => {
  const normalizedSearch = String(search || '').trim();
  if (!normalizedSearch) return;

  const searchRegex = new RegExp(escapeRegex(normalizedSearch), 'i');
  filter.$or = [
    { title: searchRegex },
    { content: searchRegex }
  ];
};

const getAudienceScope = (role) => {
  if (role === 'customer') return ['all', 'customer'];
  if (role === 'tourProvider') return ['all', 'tourProvider'];
  return null;
};

const findPaginated = async (filter, query) => {
  const { page, limit } = getPagination(query);
  const total = await Announcement.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const announcements = await Announcement.find(filter)
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username')
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * limit)
    .limit(limit);

  return { announcements, total, totalPages, currentPage, limit };
};

export const getAnnouncements = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const filter = { isActive: true };
    const audienceScope = getAudienceScope(req.user.role);
    if (audienceScope) filter.audience = { $in: audienceScope };
    appendSearch(filter, req.query.search);

    const result = await findPaginated(filter, req.query);
    return res.status(200).json({
      success: true,
      count: result.announcements.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      limit: result.limit,
      data: result.announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải thông báo hệ thống' });
  }
};

export const getManagedAnnouncements = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const filter = {};
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'draft') filter.isActive = false;
    if (req.query.audience && req.query.audience !== 'all') filter.audience = req.query.audience;
    appendSearch(filter, req.query.search);

    const result = await findPaginated(filter, req.query);
    return res.status(200).json({
      success: true,
      count: result.announcements.length,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      limit: result.limit,
      data: result.announcements
    });
  } catch (error) {
    console.error('Get managed announcements error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách thông báo quản lý' });
  }
};

export const getAnnouncementById = async (req, res) => {
  if (sendValidationError(req, res)) return;

  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'staff') {
      filter.isActive = true;
      filter.audience = { $in: getAudienceScope(req.user.role) || ['all'] };
    }

    const announcement = await Announcement.findOne(filter)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo phù hợp' });
    }

    return res.status(200).json({ success: true, data: announcement });
  } catch (error) {
    console.error('Get announcement detail error:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải chi tiết thông báo' });
  }
};
