import Tour from '../models/Tour.js';

// @desc    Get all tours
// @route   GET /api/tours
// @access  Public (Guest)
export const getAllTours = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const startIndex = (pageNum - 1) * limitNum;

    const total = await Tour.countDocuments(query);
    const tours = await Tour.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limitNum);
    
    res.status(200).json({
      success: true,
      count: tours.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: tours
    });
  } catch (error) {
    console.error('Error fetching tours:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tours'
    });
  }
};

// @desc    Get single tour
// @route   GET /api/tours/:id
// @access  Public (Guest)
export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('Error fetching tour by ID:', error);
    
    // Check if the error is a cast error (invalid ID format)
    if (error.name === 'CastError') {
       return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching tour'
    });
  }
};
