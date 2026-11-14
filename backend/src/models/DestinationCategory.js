import mongoose from 'mongoose';

const destinationCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    default: ''
  },
  // START UC-119 Delete Destination Category
  // Xóa mềm: giữ lại document để không mất lịch sử và để điểm đến đã xóa mềm
  // không bị trỏ tới một danh mục không còn tồn tại.
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
  // END UC-119 Delete Destination Category
}, {
  timestamps: true
});

// Unique trên name nhưng chỉ áp dụng cho danh mục đang sống, nhờ vậy xóa mềm
// xong vẫn tạo lại được danh mục cùng tên.
// Lưu ý: partialFilterExpression không hỗ trợ $ne nên phải dùng Boolean default false
// và backfill isDeleted = false cho dữ liệu cũ trước khi syncIndexes.
destinationCategorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

const DestinationCategory = mongoose.model('DestinationCategory', destinationCategorySchema);

/**
 * Backfill cờ isDeleted cho document cũ rồi đồng bộ index với schema.
 * Cần chạy một lần lúc khởi động vì:
 *  - document tạo trước khi có xóa mềm chưa có field isDeleted, sẽ không nằm trong
 *    partial index và có thể trùng tên với danh mục mới;
 *  - index unique cũ (name_1, không partial) phải được thay bằng index mới, nếu
 *    không thì tạo lại danh mục đã xóa mềm sẽ bị E11000.
 */
export const syncDestinationCategoryIndexes = async () => {
  try {
    await DestinationCategory.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null } }
    );
    await DestinationCategory.syncIndexes();
  } catch (error) {
    // Không chặn server khởi động: index sai chỉ ảnh hưởng bước kiểm tra trùng tên.
    console.error('Không thể đồng bộ index danh mục điểm đến:', error.message);
  }
};

export default DestinationCategory;
