import Tour from '../models/Tour.js';
import TourSubmission from '../models/TourSubmission.js';

/**
 * Đảm bảo tour đang 'pending' có đúng một bài gửi duyệt chờ xử lý (UC-129).
 *
 * - Bài gửi gần nhất needs_revision/rejected: kích hoạt lại thành pending.
 * - Chưa có bài gửi hoặc bài gần nhất approved: tạo bài gửi pending mới.
 * - Bài gần nhất đã pending: giữ nguyên.
 *
 * @returns {Promise<boolean>} true nếu vừa tạo/kích hoạt lại bài gửi.
 */
export const ensurePendingTourSubmission = async (tour, providerId) => {
  const latestSubmission = await TourSubmission.findOne({
    tourId: tour._id,
    isDeleted: { $ne: true }
  }).sort({ createdAt: -1 });

  if (latestSubmission && ['needs_revision', 'rejected'].includes(latestSubmission.status)) {
    // Kích hoạt lại bài gửi cũ.
    latestSubmission.status = 'pending';
    latestSubmission.reviewNote = '';
    latestSubmission.reviewedAt = null;
    latestSubmission.reviewedBy = null;
    await latestSubmission.save();
    return true;
  }

  if (!latestSubmission || latestSubmission.status === 'approved') {
    // Tạo bài gửi mới.
    await TourSubmission.create({
      tourId: tour._id,
      providerId: providerId || tour.providerId,
      status: 'pending'
    });
    return true;
  }

  // Đã có bài gửi chờ duyệt.
  return false;
};

/**
 * Phục hồi các tour 'pending' chưa có bài gửi chờ duyệt. Idempotent.
 *
 * @returns {Promise<Array>} danh sách tourId hiện có bài gửi chờ duyệt.
 */
export const repairOrphanPendingTourSubmissions = async () => {
  const pendingSubmissionTourIds = await TourSubmission.distinct('tourId', {
    status: 'pending',
    isDeleted: { $ne: true }
  });

  const orphanTours = await Tour.find({
    status: 'pending',
    isDeleted: { $ne: true },
    _id: { $nin: pendingSubmissionTourIds }
  }).select('_id providerId');

  for (const orphanTour of orphanTours) {
    try {
      const repaired = await ensurePendingTourSubmission(orphanTour);
      if (repaired) {
        pendingSubmissionTourIds.push(orphanTour._id);
      }
    } catch (error) {
      // Bỏ qua tour lỗi để không ảnh hưởng các tour còn lại.
      console.error('Không thể phục hồi bài gửi duyệt cho tour', orphanTour._id, error);
    }
  }

  return pendingSubmissionTourIds;
};
