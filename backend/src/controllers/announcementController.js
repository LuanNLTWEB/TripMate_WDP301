import { validationResult } from 'express-validator';
import Announcement from '../models/Announcement.js';

const getValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;

  res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: errors.array()
  });
  return true;
};

const getAudienceForUser = (user) => {
  if (user?.role === 'customer' || user?.role === 'tourProvider') return user.role;
  return null;
};

export const getAnnouncements = async (req, res) => {
  try {
    const audience = getAudienceForUser(req.user);
    const filter = { isActive: true };
    if (req.user?.role === 'staff' || req.user?.role === 'admin') {
      // Management users can review every active platform announcement.
    } else if (audience) filter.$or = [{ audience: 'all' }, { audience }];
    else filter.audience = 'all';

    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load announcements' });
  }
};

export const getManagedAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: announcements });
  } catch (error) {
    console.error('Get managed announcements error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load managed announcements' });
  }
};

export const createAnnouncement = async (req, res) => {
  if (getValidationErrors(req, res)) return;

  try {
    const announcement = await Announcement.create({
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      audience: req.body.audience || 'all',
      isActive: req.body.isActive === undefined ? true : req.body.isActive,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: populated
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create announcement' });
  }
};

export const updateAnnouncement = async (req, res) => {
  if (getValidationErrors(req, res)) return;

  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    if (req.body.title !== undefined) announcement.title = req.body.title.trim();
    if (req.body.content !== undefined) announcement.content = req.body.content.trim();
    if (req.body.audience !== undefined) announcement.audience = req.body.audience;
    if (req.body.isActive !== undefined) announcement.isActive = req.body.isActive;
    announcement.updatedBy = req.user._id;
    await announcement.save();

    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: populated
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    return res.status(500).json({ success: false, message: 'Unable to update announcement' });
  }
};

export const deleteAnnouncement = async (req, res) => {
  if (getValidationErrors(req, res)) return;

  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    return res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ success: false, message: 'Unable to delete announcement' });
  }
};
