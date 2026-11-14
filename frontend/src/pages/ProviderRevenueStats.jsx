import { useEffect, useState, useMemo } from 'react';
import { statsApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import ManagementPagination from '../components/management/ManagementPagination';

const formatCurrency = (val) => {
  if (typeof val !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
};

const formatCompactCurrency = (val) => {
  if (typeof val !== 'number' || val <= 0) return '0 ₫';
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)} Tr`;
  if (val >= 1000) return `${Math.round(val / 1000)}k`;
  return `${val} ₫`;
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

const TIME_RANGE_PILLS = [
  { value: '7_days', label: '7 ngày qua' },
  { value: '30_days', label: '30 ngày qua' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'all', label: 'Toàn bộ' },
  { value: 'custom', label: 'Tùy chọn ngày' }
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

// Helper to compute smooth SVG curves
function getCurvedPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function ProviderRevenueStats() {
  const toast = useToast();

  const [timeRange, setTimeRange] = useState('30_days');
  const [selectedTourId, setSelectedTourId] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [activeTourTab, setActiveTourTab] = useState('has_revenue'); // 'has_revenue' | 'all'

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Auto fetch data whenever filters change
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

  // Comprehensive cashflow insights
  const totalGrossValue = summary.totalCollectedRevenue + summary.totalConfirmedRevenue;
  const collectedPercent = totalGrossValue > 0
    ? Math.round((summary.totalCollectedRevenue / totalGrossValue) * 100)
    : 0;
  const confirmedPercent = totalGrossValue > 0 ? 100 - collectedPercent : 0;

  const totalAllBookings = summary.totalCompletedBookings + summary.totalConfirmedBookings + summary.totalCancelledBookings;
  const cancelRate = totalAllBookings > 0
    ? Math.round((summary.totalCancelledBookings / totalAllBookings) * 100)
    : 0;
  const avgBookingValue = summary.totalCompletedBookings > 0
    ? Math.round(summary.totalCollectedRevenue / summary.totalCompletedBookings)
    : 0;

  // Filtered transactions for the table
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

  // Tour leaderboard segregation
  const allTours = statsData?.revenueByTour || [];
  const toursWithRevenue = useMemo(() => {
    return allTours.filter((t) => t.collectedRevenue > 0 || t.confirmedRevenue > 0);
  }, [allTours]);

  const toursWithoutRevenue = useMemo(() => {
    return allTours.filter((t) => t.collectedRevenue === 0 && t.confirmedRevenue === 0);
  }, [allTours]);

  const displayedTours = activeTourTab === 'has_revenue' ? toursWithRevenue : allTours;

  // Ensure continuous timeline so chart spans seamlessly across dates
  const completeTimeSeries = useMemo(() => {
    const rawList = statsData?.timeSeries || [];
    if (rawList.length === 0) return [];

    const rawMap = new Map();
    rawList.forEach((item) => {
      rawMap.set(item.date, item);
    });

    let endDate = new Date();
    const lastItemDate = new Date(rawList[rawList.length - 1].date);
    if (lastItemDate > endDate) {
      endDate = lastItemDate;
    }

    let startDate;
    if (timeRange === '7_days') {
      startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30_days') {
      startDate = new Date(endDate.getTime() - 29 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'this_month') {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    } else if (timeRange === 'this_year') {
      startDate = new Date(endDate.getFullYear(), 0, 1);
    } else if (timeRange === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      startDate = new Date(rawList[0].date);
      endDate = new Date(rawList[rawList.length - 1].date);
    }

    const filled = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (rawMap.has(dateStr)) {
        filled.push(rawMap.get(dateStr));
      } else {
        filled.push({ date: dateStr, revenue: 0, bookings: 0 });
      }
      curr.setDate(curr.getDate() + 1);
    }

    return filled.length > 0 ? filled : rawList;
  }, [statsData?.timeSeries, timeRange, customStart, customEnd]);

  // Chart scaling calculations
  const maxSeriesRevenue = useMemo(() => {
    if (completeTimeSeries.length === 0) return 1000000;
    return Math.max(...completeTimeSeries.map((p) => p.revenue), 1000000);
  }, [completeTimeSeries]);

  const peakPoint = useMemo(() => {
    if (completeTimeSeries.length === 0) return null;
    return completeTimeSeries.reduce((max, d) => (d.revenue > max.revenue ? d : max), completeTimeSeries[0]);
  }, [completeTimeSeries]);

  const avgDayRevenue = useMemo(() => {
    if (completeTimeSeries.length === 0) return 0;
    const total = completeTimeSeries.reduce((sum, d) => sum + d.revenue, 0);
    return Math.round(total / completeTimeSeries.length);
  }, [completeTimeSeries]);

  // SVG Chart Geometry
  const chartWidth = 800;
  const chartHeight = 250;
  const paddingLeft = 65;
  const paddingRight = 16;
  const paddingTop = 18;
  const paddingBottom = 34;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const baselineY = paddingTop + plotHeight;

  const yTicks = [0, maxSeriesRevenue * 0.33, maxSeriesRevenue * 0.66, maxSeriesRevenue];

  const chartPoints = useMemo(() => {
    if (completeTimeSeries.length === 0) return [];
    return completeTimeSeries.map((item, index) => {
      // In line mode, points stretch from left border to right border
      const x = completeTimeSeries.length > 1
        ? paddingLeft + (index / (completeTimeSeries.length - 1)) * plotWidth
        : paddingLeft + plotWidth / 2;
      const ratio = maxSeriesRevenue > 0 ? item.revenue / maxSeriesRevenue : 0;
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return {
        ...item,
        x,
        y,
        index
      };
    });
  }, [completeTimeSeries, maxSeriesRevenue, plotWidth, plotHeight]);

  const linePath = useMemo(() => getCurvedPath(chartPoints), [chartPoints]);
  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    return `${linePath} L ${lastX.toFixed(1)} ${baselineY} L ${firstX.toFixed(1)} ${baselineY} Z`;
  }, [linePath, chartPoints, baselineY]);

  const barWidth = useMemo(() => {
    if (completeTimeSeries.length === 0) return 20;
    return Math.max(Math.min((plotWidth / completeTimeSeries.length) * 0.65, 28), 5);
  }, [completeTimeSeries.length, plotWidth]);

  const activeTimeRangeLabel = TIME_RANGE_PILLS.find((p) => p.value === timeRange)?.label || 'Tùy chọn';

  return (
    <section className="management-page-section">
      {/* 1. Management Header */}
      <div className="management-page-heading mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="management-page-kicker">Báo Cáo Tài Chính</span>
            <h1>Thống kê doanh thu</h1>
            <p>
              Theo dõi dòng tiền thực nhận, doanh thu chờ thu, tỷ lệ hoàn tất đơn và hiệu quả kinh doanh của từng tour.
            </p>
          </div>
          {loading && (
            <div className="d-flex align-items-center gap-2 text-primary small fw-semibold bg-primary-subtle px-3 py-2 rounded-3">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Đang đồng bộ dữ liệu...</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Filter Bar with Pills and Custom Date Range */}
      <div className="revenue-filter-bar mb-4">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          {/* Quick Time Range Pills */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="small text-muted fw-semibold me-1">
              <i className="bi bi-clock-history me-1"></i>Thời gian:
            </span>
            {TIME_RANGE_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                className={`revenue-time-pill ${timeRange === pill.value ? 'active' : ''}`}
                onClick={() => {
                  setTimeRange(pill.value);
                  setCurrentPage(1);
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Tour Selector Dropdown */}
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="revenue-tour-filter" className="small text-muted fw-semibold mb-0 text-nowrap">
              <i className="bi bi-map me-1"></i>Lọc tour:
            </label>
            <CustomSelect
              id="revenue-tour-filter"
              style={{ minWidth: '220px', maxWidth: '320px' }}
              triggerStyle={{ height: '36px', fontSize: '0.86rem' }}
              value={selectedTourId}
              onChange={(e) => {
                setSelectedTourId(e.target.value);
                setCurrentPage(1);
              }}
              options={tourSelectOptions}
            />
          </div>
        </div>

        {/* Custom Date Range Expandable Panel */}
        {timeRange === 'custom' && (
          <div className="pt-3 mt-3 border-top d-flex flex-wrap align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold text-nowrap">
                <i className="bi bi-calendar3 me-1"></i>Từ ngày:
              </span>
              <div style={{ width: '150px' }}>
                <CustomDatePicker
                  id="revenue-custom-start"
                  value={customStart}
                  onChange={(e, val) => {
                    setCustomStart(val || e?.target?.value || '');
                    setCurrentPage(1);
                  }}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold text-nowrap">
                <i className="bi bi-calendar3 me-1"></i>Đến ngày:
              </span>
              <div style={{ width: '150px' }}>
                <CustomDatePicker
                  id="revenue-custom-end"
                  value={customEnd}
                  onChange={(e, val) => {
                    setCustomEnd(val || e?.target?.value || '');
                    setCurrentPage(1);
                  }}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </div>

            <span className="small text-muted">
              Lựa chọn khoảng thời gian tùy chỉnh để phân tích dòng tiền chi tiết.
            </span>
          </div>
        )}
      </div>

      {/* 3. Four Core Hero KPI Cards */}
      <div className="revenue-kpi-grid mb-4">
        {/* Card 1: Doanh thu thực nhận */}
        <div className="revenue-kpi-card card-collected">
          <div className="revenue-kpi-header">
            <span className="revenue-kpi-label">Doanh thu thực nhận</span>
            <span className="revenue-kpi-badge bg-success-subtle text-success">
              Đã thu thành công
            </span>
          </div>
          <div className="revenue-kpi-value text-success">
            {formatCurrency(summary.totalCollectedRevenue)}
          </div>
          <div className="revenue-kpi-sub">
            <i className="bi bi-check-circle-fill text-success me-1"></i>
            Đã thu từ <strong>{summary.totalCompletedBookings}</strong> đơn hoàn tất
          </div>
        </div>

        {/* Card 2: Dự kiến thu (Chờ đón) */}
        <div className="revenue-kpi-card card-pending">
          <div className="revenue-kpi-header">
            <span className="revenue-kpi-label">Dự kiến thu khi đi</span>
            <span className="revenue-kpi-badge bg-warning-subtle text-warning-emphasis">
              Thu tại điểm đón
            </span>
          </div>
          <div className="revenue-kpi-value text-warning-emphasis">
            {formatCurrency(summary.totalConfirmedRevenue)}
          </div>
          <div className="revenue-kpi-sub">
            <i className="bi bi-hourglass-split text-warning me-1"></i>
            <strong>{summary.totalConfirmedBookings}</strong> đơn đã duyệt (chờ thu tiền)
          </div>
        </div>

        {/* Card 3: Lượt khách phục vụ */}
        <div className="revenue-kpi-card card-passengers">
          <div className="revenue-kpi-header">
            <span className="revenue-kpi-label">Khách hàng phục vụ</span>
            <span className="revenue-kpi-badge bg-primary-subtle text-primary">
              Lượt trải nghiệm
            </span>
          </div>
          <div className="revenue-kpi-value text-primary">
            {summary.totalPassengersServed.toLocaleString('vi-VN')} <span className="fs-6 fw-normal text-muted">khách</span>
          </div>
          <div className="revenue-kpi-sub">
            <i className="bi bi-people-fill text-primary me-1"></i>
            Hành khách đã tham gia các chuyến đi
          </div>
        </div>

        {/* Card 4: Doanh thu thất thoát / Đã hủy */}
        <div className="revenue-kpi-card card-cancelled">
          <div className="revenue-kpi-header">
            <span className="revenue-kpi-label">Doanh thu thất thoát</span>
            <span className="revenue-kpi-badge bg-danger-subtle text-danger">
              Đơn bị hủy
            </span>
          </div>
          <div className="revenue-kpi-value text-danger">
            {formatCurrency(summary.totalCancelledRevenue)}
          </div>
          <div className="revenue-kpi-sub">
            <i className="bi bi-x-octagon-fill text-danger me-1"></i>
            Thất thoát từ <strong>{summary.totalCancelledBookings}</strong> đơn bị hủy
          </div>
        </div>
      </div>

      {/* 4. Financial Health & Collection Ratio Banner */}
      <div className="revenue-health-card mb-4">
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-5">
            <div className="small text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '0.74rem', letterSpacing: '0.04em' }}>
              Tổng giá trị booking phát sinh (Gross Value)
            </div>
            <div className="fs-4 fw-bold text-dark mb-1">
              {formatCurrency(totalGrossValue)}
            </div>
            <div className="revenue-health-progress my-2">
              <div
                className="bg-success"
                style={{ width: `${collectedPercent}%` }}
                title={`Đã thực thu: ${collectedPercent}%`}
              ></div>
              <div
                className="bg-warning"
                style={{ width: `${confirmedPercent}%` }}
                title={`Chờ thu tại điểm đón: ${confirmedPercent}%`}
              ></div>
            </div>
            <div className="d-flex justify-content-between small text-muted" style={{ fontSize: '0.75rem' }}>
              <span>
                <span className="badge bg-success rounded-circle p-1 me-1"> </span>
                Đã thực thu: <strong>{collectedPercent}%</strong>
              </span>
              <span>
                <span className="badge bg-warning rounded-circle p-1 me-1"> </span>
                Chờ thu: <strong>{confirmedPercent}%</strong>
              </span>
            </div>
          </div>

          <div className="col-12 col-md-7 border-start-md">
            <div className="row g-2 text-center text-md-start">
              <div className="col-4">
                <div className="p-2.5 bg-light rounded-3">
                  <span className="text-muted small d-block mb-1">Tỷ lệ thu tiền</span>
                  <span className="fw-bold fs-5 text-success">{collectedPercent}%</span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2.5 bg-light rounded-3">
                  <span className="text-muted small d-block mb-1">Giá trị TB / đơn</span>
                  <span className="fw-bold fs-6 text-dark text-truncate d-block" title={formatCurrency(avgBookingValue)}>
                    {formatCompactCurrency(avgBookingValue)}
                  </span>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2.5 bg-light rounded-3">
                  <span className="text-muted small d-block mb-1">Tỷ lệ hủy đơn</span>
                  <span className={`fw-bold fs-5 ${cancelRate > 15 ? 'text-danger' : 'text-muted'}`}>
                    {cancelRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Charts & Tour Performance Breakdown */}
      <div className="row g-4 mb-4 align-items-start">
        {/* Left Column: Interactive Revenue Trend Chart */}
        <div className="col-12 col-lg-8">
          <div className="revenue-chart-card">
            {/* Header with Type Toggle and Peak Stats */}
            <div className="revenue-chart-header">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h5 className="fw-bold mb-1 text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-graph-up text-primary"></i>
                    <span>Xu hướng doanh thu theo thời gian</span>
                  </h5>
                  <div className="small text-muted">
                    {peakPoint && peakPoint.revenue > 0 ? (
                      <span>
                        Cao nhất: <strong className="text-success">{formatCurrency(peakPoint.revenue)}</strong> ({formatDate(peakPoint.date)}) · TB: <strong>{formatCurrency(avgDayRevenue)}/ngày</strong>
                      </span>
                    ) : (
                      <span>Theo dõi phân bổ doanh thu phát sinh theo từng ngày</span>
                    )}
                  </div>
                </div>

                {/* Chart Mode Toggle */}
                <div className="btn-group btn-group-sm" role="group" aria-label="Loại biểu đồ">
                  <button
                    type="button"
                    className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setChartType('line')}
                    title="Biểu đồ đường mượt"
                  >
                    <i className="bi bi-activity me-1"></i>Đường
                  </button>
                  <button
                    type="button"
                    className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setChartType('bar')}
                    title="Biểu đồ cột"
                  >
                    <i className="bi bi-bar-chart-fill me-1"></i>Cột
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Visual Chart Body */}
            <div className="revenue-chart-body">
              {chartPoints.length === 0 ? (
                <div className="text-center py-5 text-muted my-auto">
                  <div className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center p-3 mb-2">
                    <i className="bi bi-bar-chart fs-1 text-secondary opacity-50"></i>
                  </div>
                  <h6 className="fw-bold text-dark mb-1">Chưa có dữ liệu doanh thu phát sinh</h6>
                  <p className="small text-muted mb-0">Các đơn đặt tour được thanh toán sẽ tự động xuất hiện tại đây.</p>
                </div>
              ) : (
                <>
                  {/* Floating Tooltip */}
                  {hoveredPoint && (
                    <div
                      className="revenue-chart-tooltip"
                      style={{
                        left: `${Math.min(Math.max(hoveredPoint.x, 70), chartWidth - 70)}px`,
                        top: `${Math.max(hoveredPoint.y, 40)}px`
                      }}
                    >
                      <div className="fw-bold">{formatDate(hoveredPoint.date)}</div>
                      <div className="text-success fw-bold">{formatCurrency(hoveredPoint.revenue)}</div>
                      <div className="text-light opacity-75 small">{hoveredPoint.bookings} đơn đặt tour</div>
                    </div>
                  )}

                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-100"
                    style={{ overflow: 'visible', display: 'block' }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Horizontal Gridlines & Y-axis labels */}
                    {yTicks.map((tickVal) => {
                      const yPos = paddingTop + plotHeight - (maxSeriesRevenue > 0 ? (tickVal / maxSeriesRevenue) * plotHeight : 0);
                      return (
                        <g key={`tick-${tickVal}`}>
                          <line
                            x1={paddingLeft}
                            y1={yPos}
                            x2={chartWidth - paddingRight}
                            y2={yPos}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={paddingLeft - 8}
                            y={yPos + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="#94a3b8"
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {formatCompactCurrency(tickVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Active Hover Guide Line */}
                    {hoveredPoint && (
                      <line
                        x1={hoveredPoint.x}
                        y1={paddingTop}
                        x2={hoveredPoint.x}
                        y2={baselineY}
                        stroke="#0284c7"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Line Chart Elements */}
                    {chartType === 'line' && (
                      <>
                        <path d={areaPath} fill="#0284c7" fillOpacity="0.08" />
                        <path d={linePath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                        {chartPoints.map((p) => {
                          const isHovered = hoveredPoint?.index === p.index;
                          return (
                            <g key={`pt-${p.index}`}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={isHovered ? 6 : p.revenue > 0 ? 3.5 : 2}
                                fill={isHovered ? '#10b981' : p.revenue > 0 ? '#0284c7' : '#cbd5e1'}
                                stroke="#ffffff"
                                strokeWidth={isHovered ? 2.5 : 1.5}
                                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                                onMouseEnter={() => setHoveredPoint(p)}
                              />
                            </g>
                          );
                        })}
                      </>
                    )}

                    {/* Bar Chart Elements */}
                    {chartType === 'bar' &&
                      chartPoints.map((p) => {
                        const isHovered = hoveredPoint?.index === p.index;
                        const barX = paddingLeft + (p.index + 0.5) * (plotWidth / chartPoints.length) - barWidth / 2;
                        const rawHeight = plotHeight - (p.y - paddingTop);
                        const barH = Math.max(rawHeight, p.revenue > 0 ? 6 : 2);
                        const barY = baselineY - barH;

                        return (
                          <rect
                            key={`bar-${p.index}`}
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barH}
                            rx={Math.min(barWidth / 2, 4)}
                            fill={isHovered ? '#10b981' : p.revenue > 0 ? '#0284c7' : '#e2e8f0'}
                            style={{ cursor: 'pointer', transition: 'fill 0.18s ease' }}
                            onMouseEnter={() => setHoveredPoint(p)}
                          />
                        );
                      })}

                    {/* X-axis Date Labels */}
                    {chartPoints.map((p, idx) => {
                      const totalCount = chartPoints.length;
                      let shouldShow = false;
                      if (totalCount <= 8) {
                        shouldShow = true;
                      } else {
                        const step = Math.ceil((totalCount - 1) / 5);
                        shouldShow = idx % step === 0 || idx === totalCount - 1;
                      }

                      if (!shouldShow) return null;
                      const dateLabel = p.date ? p.date.slice(5) : '';
                      return (
                        <text
                          key={`xlabel-${p.index}`}
                          x={p.x}
                          y={chartHeight - 12}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#94a3b8"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {dateLabel}
                        </text>
                      );
                    })}
                  </svg>
                </>
              )}
            </div>

            {/* Grounded Bottom Footer Bar */}
            <div className="revenue-chart-footer">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                  <i className="bi bi-calendar-check me-1"></i>
                  {activeTimeRangeLabel}
                </span>
                <span className="text-muted small">
                  Tổng {completeTimeSeries.length} ngày theo dõi
                </span>
              </div>
              <div className="text-end small">
                <span className="text-muted">Tổng thực thu kỳ này: </span>
                <strong className="text-success fs-6">{formatCurrency(summary.totalCollectedRevenue)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Top Tours by Revenue Leaderboard */}
        <div className="col-12 col-lg-4">
          <div className="revenue-tours-card">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <div>
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                  <i className="bi bi-trophy-fill text-warning"></i>
                  <span>Hiệu quả theo Tour</span>
                </h5>
                <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                  Đóng góp doanh thu từng tour
                </span>
              </div>

              {/* Tour Tab Buttons */}
              <div className="revenue-tour-tabs">
                <button
                  type="button"
                  className={`revenue-tour-tab-btn ${activeTourTab === 'has_revenue' ? 'active' : ''}`}
                  onClick={() => setActiveTourTab('has_revenue')}
                  title="Chỉ hiện các tour có phát sinh doanh thu"
                >
                  Có thu ({toursWithRevenue.length})
                </button>
                <button
                  type="button"
                  className={`revenue-tour-tab-btn ${activeTourTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTourTab('all')}
                  title="Tất cả các tour"
                >
                  Tất cả ({allTours.length})
                </button>
              </div>
            </div>

            {displayedTours.length === 0 ? (
              <div className="text-center py-5 text-muted my-auto">
                <i className="bi bi-inbox fs-2 text-secondary opacity-50 d-block mb-2"></i>
                Chưa có tour nào phát sinh doanh thu trong kỳ này.
              </div>
            ) : (
              <div className="revenue-tour-list">
                {displayedTours.map((tourItem, idx) => {
                  const percentOfTotal = summary.totalCollectedRevenue > 0
                    ? Math.round((tourItem.collectedRevenue / summary.totalCollectedRevenue) * 100)
                    : 0;

                  const hasRevenue = tourItem.collectedRevenue > 0 || tourItem.confirmedRevenue > 0;
                  const rankClass =
                    idx === 0 && hasRevenue ? 'revenue-tour-rank-gold' :
                    idx === 1 && hasRevenue ? 'revenue-tour-rank-silver' :
                    idx === 2 && hasRevenue ? 'revenue-tour-rank-bronze' :
                    'revenue-tour-rank-plain';

                  return (
                    <div key={tourItem.tourId} className="revenue-tour-item">
                      {/* Top: Rank + Title + Badge */}
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-1.5">
                        <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1 min-width-0">
                          <span className={`revenue-tour-rank ${rankClass}`}>
                            {idx + 1}
                          </span>
                          <div
                            className="fw-bold text-dark small text-truncate"
                            title={tourItem.title}
                          >
                            {tourItem.title}
                          </div>
                        </div>

                        {hasRevenue ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5 flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                            {percentOfTotal}% tổng thu
                          </span>
                        ) : (
                          <span className="badge bg-light text-muted border rounded-pill px-2 py-0.5 flex-shrink-0" style={{ fontSize: '0.7rem' }}>
                            Chưa có đơn
                          </span>
                        )}
                      </div>

                      {/* Middle: Revenue and Pending info */}
                      <div className="d-flex justify-content-between align-items-center ps-4 mb-1">
                        <div className={`fs-6 fw-bold ${hasRevenue ? 'text-success' : 'text-muted'}`}>
                          {formatCurrency(tourItem.collectedRevenue)}
                        </div>
                        {tourItem.confirmedRevenue > 0 && (
                          <span className="small text-warning-emphasis fw-medium" style={{ fontSize: '0.72rem' }}>
                            Chờ thu: {formatCompactCurrency(tourItem.confirmedRevenue)}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {hasRevenue && (
                        <div className="progress ms-4 my-1.5" style={{ height: '5px', backgroundColor: '#e2e8f0', borderRadius: '999px' }}>
                          <div
                            className="progress-bar bg-success rounded-pill"
                            role="progressbar"
                            style={{ width: `${Math.max(percentOfTotal, 3)}%` }}
                            aria-valuenow={percentOfTotal}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      )}

                      {/* Bottom details: Bookings & Passengers */}
                      <div className="d-flex justify-content-between text-muted ps-4 pt-1" style={{ fontSize: '0.74rem' }}>
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

                {/* Helpful note for remaining zero-revenue tours */}
                {activeTourTab === 'has_revenue' && toursWithoutRevenue.length > 0 && (
                  <div className="p-2.5 text-center bg-light rounded-3 mt-1 small text-muted">
                    <span>Còn <strong>{toursWithoutRevenue.length}</strong> tour chưa phát sinh doanh thu trong kỳ. </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                      onClick={() => setActiveTourTab('all')}
                    >
                      Xem tất cả →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Detailed Transactions Table */}
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
              style={{ width: '190px' }}
              triggerStyle={{ height: '38px', fontSize: '0.86rem' }}
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
                <th style={{ width: '16%' }}>Mã &amp; Thời gian</th>
                <th style={{ width: '25%' }}>Tour du lịch</th>
                <th style={{ width: '22%' }}>Khách hàng</th>
                <th style={{ width: '12%' }}>Khởi hành</th>
                <th style={{ width: '13%' }}>Số tiền</th>
                <th className="text-end" style={{ width: '12%' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <span className="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
                    Đang tải danh sách giao dịch...
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
                          : 'Các đơn đặt tour và dòng tiền sẽ được ghi nhận tự động tại đây.'}
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
                        <span className="text-muted" style={{ fontSize: '0.74rem' }}>
                          {formatDateTime(tx.createdAt)}
                        </span>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '240px' }} title={tx.tourTitle}>
                          {tx.tourTitle}
                        </div>
                        <div className="small text-muted">
                          <i className="bi bi-people me-1 text-primary"></i>
                          {tx.numberOfPeople} hành khách
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark small">{tx.customerName}</div>
                        {tx.phone && (
                          <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                            <i className="bi bi-telephone me-1 text-primary"></i>{tx.phone}
                          </div>
                        )}
                        {tx.customerEmail && (
                          <div className="text-muted text-truncate" style={{ fontSize: '0.74rem', maxWidth: '180px' }} title={tx.customerEmail}>
                            <i className="bi bi-envelope me-1"></i>{tx.customerEmail}
                          </div>
                        )}
                      </td>

                      <td className="small text-muted">
                        <i className="bi bi-calendar3 me-1 text-primary"></i>
                        {formatDate(tx.departureDate)}
                      </td>

                      <td>
                        <div className="fw-bold text-dark">
                          {formatCurrency(tx.totalPrice)}
                        </div>
                        <div className="mt-0.5">
                          {tx.paymentMethod === 'bank_transfer' ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '0.68rem' }}>
                              <i className="bi bi-bank me-1"></i>Chuyển khoản
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: '0.68rem' }}>
                              <i className="bi bi-cash me-1"></i>Thu tại đón
                            </span>
                          )}
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
