import { useEffect, useState, useMemo } from 'react';
import { statsApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import ManagementPagination from '../components/management/ManagementPagination';

const formatCurrency = (val) => {
  if (typeof val !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('vi-VN');
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'paid':
      return { label: 'Đã thanh toán', className: 'badge-info' };
    case 'checked_in':
      return { label: 'Đã điểm danh', className: 'badge-primary' };
    case 'completed':
      return { label: 'Đã hoàn thành', className: 'badge-success' };
    case 'confirmed':
      return { label: 'Đã duyệt (Chờ thu)', className: 'badge-warning' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'badge-danger' };
    case 'pending':
    default:
      return { label: 'Chờ xử lý', className: 'badge-secondary' };
  }
};

const TIME_RANGE_OPTIONS = [
  { value: '7_days', label: '7 ngày qua', icon: 'bi bi-clock-history' },
  { value: '30_days', label: '30 ngày qua', icon: 'bi bi-calendar-range' },
  { value: 'this_month', label: 'Tháng này', icon: 'bi bi-calendar-month' },
  { value: 'this_year', label: 'Năm nay', icon: 'bi bi-calendar-check' },
  { value: 'all', label: 'Toàn bộ thời gian', icon: 'bi bi-infinity' },
  { value: 'custom', label: 'Tùy chọn khoảng ngày', icon: 'bi bi-calendar3' }
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái', icon: 'bi bi-collection' },
  { value: 'paid', label: 'Đã thanh toán', icon: 'bi bi-cash-coin text-info' },
  { value: 'checked_in', label: 'Đã điểm danh', icon: 'bi bi-person-check text-primary' },
  { value: 'completed', label: 'Đã hoàn thành', icon: 'bi bi-flag-fill text-success' },
  { value: 'confirmed', label: 'Đã duyệt (Chờ thu)', icon: 'bi bi-hourglass-split text-warning' },
  { value: 'cancelled', label: 'Đã hủy', icon: 'bi bi-x-circle text-danger' }
];

const ITEMS_PER_PAGE = 10;

export default function ProviderRevenueStats() {
  const toast = useToast();

  const [timeRange, setTimeRange] = useState('30_days');
  const [selectedTourId, setSelectedTourId] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Auto fetch data whenever any filter changes
  useEffect(() => {
    let isCancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = {
          timeRange,
          tourId: selectedTourId
        };
        if (timeRange === 'custom') {
          if (customStart) params.startDate = customStart;
          if (customEnd) params.endDate = customEnd;
        }

        const res = await statsApi.getProviderRevenue(params);
        if (!isCancelled && res.success) {
          setStatsData(res.data);
        }
      } catch (err) {
        if (!isCancelled) {
          toast.error(err.message || 'Không thể tải thống kê doanh thu');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isCancelled = true;
    };
  }, [timeRange, selectedTourId, customStart, customEnd]);

  const summary = statsData?.summary || {
    totalCollectedRevenue: 0,
    totalConfirmedRevenue: 0,
    totalCancelledRevenue: 0,
    totalCompletedBookings: 0,
    totalConfirmedBookings: 0,
    totalCancelledBookings: 0,
    totalPassengersServed: 0
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const list = statsData?.recentTransactions || [];
    return list.filter((tx) => {
      const matchSearch =
        !searchTerm.trim() ||
        (tx.tourTitle && tx.tourTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.phone && tx.phone.includes(searchTerm)) ||
        (tx.customerEmail && tx.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx._id && String(tx._id).toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [statsData?.recentTransactions, searchTerm, statusFilter]);

  // Pagination for transactions
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Max revenue in time series for chart scaling
  const maxSeriesRevenue = useMemo(() => {
    const points = statsData?.timeSeries || [];
    if (points.length === 0) return 1;
    return Math.max(...points.map((p) => p.revenue), 1);
  }, [statsData?.timeSeries]);

  const tourSelectOptions = useMemo(() => {
    const tours = statsData?.tours || [];
    return [
      { value: 'all', label: `Tất cả các tour (${tours.length})`, icon: 'bi bi-collection' },
      ...tours.map((t) => ({
        value: t._id,
        label: t.title,
        icon: 'bi bi-map'
      }))
    ];
  }, [statsData?.tours]);

  return (
    <section className="management-page-section">
      {/* Management Header */}
      <div className="management-page-heading">
        <span className="management-page-kicker">Revenue & Analytics</span>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h1>Thống kê doanh thu</h1>
            <p>Báo cáo chi tiết dòng tiền, số lượng vé đã bán và tình hình tăng trưởng của các tour.</p>
          </div>
          {loading && (
            <div className="d-flex align-items-center gap-2 text-primary small fw-semibold">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Đang tự động cập nhật dữ liệu...</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar with CustomSelect and CustomDatePicker */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="revenue-time-range" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-calendar3 me-1"></i>Khoảng thời gian:
            </label>
            <CustomSelect
              id="revenue-time-range"
              style={{ width: '200px' }}
              triggerStyle={{ height: '38px', fontSize: '0.88rem' }}
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                setCurrentPage(1);
              }}
              options={TIME_RANGE_OPTIONS}
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="revenue-tour-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-map me-1"></i>Tour:
            </label>
            <CustomSelect
              id="revenue-tour-filter"
              style={{ minWidth: '240px', maxWidth: '360px' }}
              triggerStyle={{ height: '38px', fontSize: '0.88rem' }}
              value={selectedTourId}
              onChange={(e) => {
                setSelectedTourId(e.target.value);
                setCurrentPage(1);
              }}
              options={tourSelectOptions}
            />
          </div>

          {timeRange === 'custom' && (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted fw-semibold text-nowrap">Từ:</span>
                <div style={{ width: '160px' }}>
                  <CustomDatePicker
                    id="revenue-custom-start"
                    value={customStart}
                    onChange={(e, val) => {
                      setCustomStart(val || e?.target?.value || '');
                      setCurrentPage(1);
                    }}
                    placeholder="Từ ngày"
                  />
                </div>
              </div>
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted fw-semibold text-nowrap">Đến:</span>
                <div style={{ width: '160px' }}>
                  <CustomDatePicker
                    id="revenue-custom-end"
                    value={customEnd}
                    onChange={(e, val) => {
                      setCustomEnd(val || e?.target?.value || '');
                      setCurrentPage(1);
                    }}
                    placeholder="Đến ngày"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Collected Revenue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-muted fw-semibold text-uppercase">Doanh thu thực thu</span>
              <span className="badge bg-success-subtle text-success rounded-circle p-2">
                <i className="bi bi-wallet2 fs-5"></i>
              </span>
            </div>
            <div className="fs-4 fw-bold text-success mb-1">
              {formatCurrency(summary.totalCollectedRevenue)}
            </div>
            <div className="small text-muted">
              Đã thu từ <strong>{summary.totalCompletedBookings}</strong> đơn đặt tour
            </div>
          </div>
        </div>

        {/* Card 2: Confirmed / Pending Revenue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-muted fw-semibold text-uppercase">Doanh thu chờ thu</span>
              <span className="badge bg-warning-subtle text-warning-emphasis rounded-circle p-2">
                <i className="bi bi-hourglass-split fs-5"></i>
              </span>
            </div>
            <div className="fs-4 fw-bold text-warning-emphasis mb-1">
              {formatCurrency(summary.totalConfirmedRevenue)}
            </div>
            <div className="small text-muted">
              <strong>{summary.totalConfirmedBookings}</strong> đơn đã xác nhận (thu tại điểm đón)
            </div>
          </div>
        </div>

        {/* Card 3: Total Passengers */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-muted fw-semibold text-uppercase">Lượt khách phục vụ</span>
              <span className="badge bg-info-subtle text-info rounded-circle p-2">
                <i className="bi bi-people-fill fs-5"></i>
              </span>
            </div>
            <div className="fs-4 fw-bold text-dark mb-1">
              {summary.totalPassengersServed.toLocaleString('vi-VN')} <span className="fs-6 fw-normal text-muted">hành khách</span>
            </div>
            <div className="small text-muted">
              Tổng số người đã tham gia các tour
            </div>
          </div>
        </div>

        {/* Card 4: Cancelled Bookings */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="small text-muted fw-semibold text-uppercase">Doanh thu đã hủy</span>
              <span className="badge bg-danger-subtle text-danger rounded-circle p-2">
                <i className="bi bi-x-octagon-fill fs-5"></i>
              </span>
            </div>
            <div className="fs-4 fw-bold text-danger mb-1">
              {formatCurrency(summary.totalCancelledRevenue)}
            </div>
            <div className="small text-muted">
              <strong>{summary.totalCancelledBookings}</strong> đơn đặt tour đã bị hủy
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Tour Performance Breakdown */}
      <div className="row g-4 mb-4">
        {/* Time-Series Revenue Trend Chart */}
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark">
                <i className="bi bi-graph-up text-primary me-2"></i>
                Xu hướng doanh thu theo thời gian
              </h5>
              <span className="badge bg-light text-muted fw-normal border">
                {statsData?.timeSeries?.length || 0} mốc ghi nhận
              </span>
            </div>

            {(!statsData?.timeSeries || statsData.timeSeries.length === 0) ? (
              <div className="text-center py-5 text-muted my-auto">
                <i className="bi bi-bar-chart fs-1 text-secondary opacity-50 d-block mb-2"></i>
                Chưa có dữ liệu doanh thu phát sinh trong khoảng thời gian này.
              </div>
            ) : (
              <div className="d-flex flex-column justify-content-end pt-4" style={{ minHeight: '260px' }}>
                <div className="d-flex align-items-end justify-content-between gap-2 h-100 pb-2 border-bottom">
                  {statsData.timeSeries.map((item, idx) => {
                    const heightPercent = Math.max(Math.round((item.revenue / maxSeriesRevenue) * 100), 6);
                    return (
                      <div
                        key={idx}
                        className="d-flex flex-column align-items-center flex-grow-1"
                        style={{ maxWidth: '48px' }}
                        title={`${item.date}: ${formatCurrency(item.revenue)} (${item.bookings} đơn)`}
                      >
                        <div className="small fw-bold text-success mb-1 text-nowrap d-none d-md-block" style={{ fontSize: '0.68rem' }}>
                          {item.revenue > 0 ? (item.revenue / 1000000 >= 1 ? `${(item.revenue / 1000000).toFixed(1)}Tr` : `${Math.round(item.revenue / 1000)}k`) : ''}
                        </div>
                        <div
                          className="w-100 rounded-top bg-primary bg-gradient transition-all"
                          style={{
                            height: `${heightPercent}%`,
                            minHeight: '8px',
                            opacity: item.revenue > 0 ? 0.9 : 0.25
                          }}
                        ></div>
                        <div className="text-muted mt-2 text-truncate" style={{ fontSize: '0.7rem' }}>
                          {item.date ? item.date.slice(5) : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="d-flex justify-content-between text-muted small mt-2">
                  <span>Trục ngang: Ngày ghi nhận</span>
                  <span>Đơn vị: VNĐ</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Tours by Revenue Breakdown */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-trophy-fill text-warning"></i>
                  <span>Hiệu quả theo từng Tour</span>
                </h5>
                <span className="text-muted small" style={{ fontSize: '0.8rem' }}>Đóng góp doanh thu của các tour</span>
              </div>
              <span className="badge bg-light text-muted border rounded-pill px-2.5 py-1 small">
                {statsData?.revenueByTour?.length || 0} tour
              </span>
            </div>

            {(!statsData?.revenueByTour || statsData.revenueByTour.length === 0) ? (
              <div className="text-center py-5 text-muted my-auto">
                <i className="bi bi-inbox fs-2 text-secondary opacity-50 d-block mb-2"></i>
                Chưa có dữ liệu doanh thu theo tour.
              </div>
            ) : (
              <div
                className="d-flex flex-column gap-2.5 flex-grow-1"
                style={{
                  maxHeight: statsData.revenueByTour.length > 4 ? '360px' : 'none',
                  overflowY: statsData.revenueByTour.length > 4 ? 'auto' : 'visible'
                }}
              >
                {statsData.revenueByTour.map((tourItem, idx) => {
                  const percentOfTotal = summary.totalCollectedRevenue > 0
                    ? Math.round((tourItem.collectedRevenue / summary.totalCollectedRevenue) * 100)
                    : 0;

                  // Rank Badge colors (Gold, Silver, Bronze, or Neutral)
                  const rankBadgeClass =
                    idx === 0 ? 'bg-warning text-dark' :
                    idx === 1 ? 'bg-secondary-subtle text-secondary' :
                    idx === 2 ? 'bg-danger-subtle text-danger' :
                    'bg-light text-muted border';

                  return (
                    <div
                      key={tourItem.tourId}
                      className="p-3 rounded-3 bg-light bg-opacity-50 border"
                      style={{ transition: 'all 0.2s ease' }}
                    >
                      {/* Top: Rank + Tour Title */}
                      <div className="d-flex align-items-start gap-2 mb-2">
                        <span
                          className={`badge rounded-circle fw-bold flex-shrink-0 ${rankBadgeClass}`}
                          style={{ width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem' }}
                        >
                          {idx + 1}
                        </span>
                        <div
                          className="fw-bold text-dark small text-truncate flex-grow-1"
                          title={tourItem.title}
                          style={{ lineHeight: '1.4' }}
                        >
                          {tourItem.title}
                        </div>
                      </div>

                      {/* Middle: Revenue and Percentage Badge */}
                      <div className="d-flex justify-content-between align-items-center mb-1 ps-4">
                        <div className="fw-bold text-success fs-6">
                          {formatCurrency(tourItem.collectedRevenue)}
                        </div>
                        {summary.totalCollectedRevenue > 0 ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                            {percentOfTotal}% tổng thu
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border rounded-pill px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                            0% tổng thu
                          </span>
                        )}
                      </div>

                      {/* Progress Bar (Only when total revenue > 0) */}
                      {summary.totalCollectedRevenue > 0 && (
                        <div className="progress ms-4 my-1.5" style={{ height: '5px', backgroundColor: '#e2e8f0', borderRadius: '999px' }}>
                          <div
                            className="progress-bar bg-success rounded-pill"
                            role="progressbar"
                            style={{ width: `${Math.max(percentOfTotal, 2)}%` }}
                            aria-valuenow={percentOfTotal}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      )}

                      {/* Bottom details: Bookings & Passengers */}
                      <div className="d-flex justify-content-between text-muted ps-4" style={{ fontSize: '0.75rem' }}>
                        <span>
                          <i className="bi bi-receipt me-1 text-primary"></i>
                          {tourItem.completedBookings} đơn thành công
                        </span>
                        <span>
                          <i className="bi bi-people me-1 text-info"></i>
                          {tourItem.passengers} hành khách
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Transactions Table - Reusing Unified Management Design */}
      <div className="management-table-card">
        <div className="management-table-toolbar">
          <div className="management-search-box">
            <i className="bi bi-search"></i>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm khách hàng, tour, SĐT, mã đặt tour..."
              aria-label="Tìm kiếm giao dịch"
            />
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="tx-status-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-funnel me-1"></i>Trạng thái:
            </label>
            <CustomSelect
              id="tx-status-filter"
              style={{ width: '200px' }}
              triggerStyle={{ height: '40px', fontSize: '0.88rem' }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="management-table align-middle">
            <thead>
              <tr>
                <th style={{ width: '16%' }}>Mã & Ngày đặt</th>
                <th style={{ width: '24%' }}>Tour du lịch</th>
                <th style={{ width: '20%' }}>Khách hàng</th>
                <th style={{ width: '13%' }}>Khởi hành</th>
                <th style={{ width: '12%' }}>Số tiền</th>
                <th className="text-end" style={{ width: '15%' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <span className="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="management-empty-state">
                      <div className="management-empty-icon">
                        <i className="bi bi-inbox fs-2"></i>
                      </div>
                      <h6 className="fw-bold text-dark mb-1">Không tìm thấy giao dịch phù hợp</h6>
                      <p className="small text-muted mb-0">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'
                          : 'Các đơn đặt tour và dòng tiền sẽ được cập nhật tự động tại đây.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const badge = getStatusBadge(tx.status);
                  return (
                    <tr key={tx._id}>
                      <td>
                        <span className="font-monospace small fw-bold text-dark d-block">
                          #{String(tx._id).slice(-6).toUpperCase()}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {formatDateTime(tx.createdAt)}
                        </span>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '260px' }} title={tx.tourTitle}>
                          {tx.tourTitle}
                        </div>
                        <div className="small text-muted">
                          {tx.numberOfPeople} hành khách
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark small">{tx.customerName}</div>
                        {tx.phone && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-telephone me-1"></i>{tx.phone}
                          </div>
                        )}
                      </td>

                      <td className="small text-muted">
                        <i className="bi bi-calendar3 me-1"></i>{formatDate(tx.departureDate)}
                      </td>

                      <td>
                        <div className="fw-bold text-primary">
                          {formatCurrency(tx.totalPrice)}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {tx.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Thu tại đón'}
                        </div>
                      </td>

                      <td className="text-end">
                        <span className={`management-badge ${badge.className}`}>
                          <span className="management-badge-dot"></span>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Management Pagination */}
        {!loading && filteredTransactions.length > ITEMS_PER_PAGE && (
          <ManagementPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTransactions.length}
            itemLabel="giao dịch"
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
          />
        )}
      </div>
    </section>
  );
}
