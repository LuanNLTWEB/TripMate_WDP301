import { useState } from 'react';

function MonthlyRegistrationChart({ data = [], monthsCount = 12, onMonthsChange, trend }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const series = data || [];
  const maxCount = Math.max(...series.map((item) => item.count), 5);

  // SVG dimensions & margins
  const width = 760;
  const height = 280;
  const paddingLeft = 46;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 42;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Y-axis ticks (4 ticks)
  const yTicks = [0, Math.ceil(maxCount * 0.33), Math.ceil(maxCount * 0.66), maxCount];

  // Calculate coordinates for each data point
  const points = series.map((item, index) => {
    const x = paddingLeft + (index + 0.5) * (chartWidth / series.length);
    const yRatio = maxCount > 0 ? item.count / maxCount : 0;
    const y = paddingTop + chartHeight - yRatio * chartHeight;
    return { ...item, x, y, index };
  });

  // Calculate path string for Line Chart
  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    : '';

  // Area path for gradient under line
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${paddingTop + chartHeight} L ${points[0].x.toFixed(1)} ${paddingTop + chartHeight} Z`
    : '';

  const barWidth = Math.max(Math.min((chartWidth / series.length) * 0.55, 36), 14);

  // Summary figures
  const totalInPeriod = trend?.totalInPeriod ?? series.reduce((sum, item) => sum + item.count, 0);
  const currentMonthData = series[series.length - 1] || { count: 0 };
  const prevMonthData = series[series.length - 2] || { count: 0 };
  const growthRate = currentMonthData.growth ?? 0;

  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body p-4">
        {/* Card Header & Controls */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
          <div>
            <span className="badge bg-primary-subtle text-primary mb-1">
              <i className="bi bi-graph-up me-1"></i> Xu hướng tăng trưởng
            </span>
            <h2 className="h5 fw-bold mb-1">Đăng ký mới theo tháng</h2>
            <p className="text-muted small mb-0">
              Số lượng tài khoản mới tạo theo từng tháng ({monthsCount} tháng gần nhất)
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Months Range Selector */}
            <div className="btn-group btn-group-sm" role="group" aria-label="Khoảng thời gian">
              <button
                type="button"
                className={`btn ${monthsCount === 6 ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => onMonthsChange?.(6)}
              >
                6 tháng
              </button>
              <button
                type="button"
                className={`btn ${monthsCount === 12 ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => onMonthsChange?.(12)}
              >
                12 tháng
              </button>
            </div>

            {/* Chart Type Toggle */}
            <div className="btn-group btn-group-sm" role="group" aria-label="Loại biểu đồ">
              <button
                type="button"
                className={`btn ${chartType === 'bar' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setChartType('bar')}
                title="Biểu đồ cột"
              >
                <i className="bi bi-bar-chart-fill"></i>
              </button>
              <button
                type="button"
                className={`btn ${chartType === 'line' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setChartType('line')}
                title="Biểu đồ đường"
              >
                <i className="bi bi-activity"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Trend Metrics */}
        <div className="row g-2 mb-3">
          <div className="col-6 col-md-4">
            <div className="p-2 bg-light rounded-3">
              <span className="text-muted small d-block">Tổng trong kỳ</span>
              <strong className="fs-5 text-primary">{totalInPeriod}</strong>{' '}
              <small className="text-muted">tài khoản</small>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <div className="p-2 bg-light rounded-3">
              <span className="text-muted small d-block">Tháng này ({currentMonthData.label || '—'})</span>
              <strong className="fs-5 text-dark">{currentMonthData.count}</strong>{' '}
              <small className="text-muted">tài khoản</small>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="p-2 bg-light rounded-3">
              <span className="text-muted small d-block">So với tháng trước</span>
              <span
                className={`badge ${
                  growthRate > 0
                    ? 'bg-success-subtle text-success'
                    : growthRate < 0
                    ? 'bg-danger-subtle text-danger'
                    : 'bg-secondary-subtle text-secondary'
                }`}
              >
                <i
                  className={`bi me-1 ${
                    growthRate > 0 ? 'bi-arrow-up-right' : growthRate < 0 ? 'bi-arrow-down-right' : 'bi-dash'
                  }`}
                ></i>
                {growthRate > 0 ? `+${growthRate}%` : `${growthRate}%`}
              </span>
              <small className="text-muted ms-1">(tháng trước: {prevMonthData.count})</small>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        {series.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-bar-chart fs-1 d-block mb-2 text-secondary opacity-50"></i>
            Chưa có dữ liệu đăng ký trong khoảng thời gian này.
          </div>
        ) : (
          <div className="position-relative" style={{ minHeight: '260px' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-100"
              style={{ overflow: 'visible', maxHeight: '320px' }}
              aria-label="Biểu đồ thống kê người dùng đăng ký mới"
            >
              <defs>
                {/* Gradient for Bars */}
                <linearGradient id="adminBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#3d8bfd" stopOpacity="0.65" />
                </linearGradient>
                <linearGradient id="adminBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffc107" stopOpacity="1" />
                  <stop offset="100%" stopColor="#fd7e14" stopOpacity="0.85" />
                </linearGradient>
                {/* Gradient for Line Area */}
                <linearGradient id="adminAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-axis labels */}
              {yTicks.map((tickValue) => {
                const yPos = paddingTop + chartHeight - (maxCount > 0 ? (tickValue / maxCount) * chartHeight : 0);
                return (
                  <g key={`ytick-${tickValue}`}>
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={width - paddingRight}
                      y2={yPos}
                      stroke="#e2e8f0"
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
                      {tickValue}
                    </text>
                  </g>
                );
              })}

              {/* Baseline */}
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight}
                x2={width - paddingRight}
                y2={paddingTop + chartHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Line Chart Mode */}
              {chartType === 'line' && (
                <>
                  <path d={areaPath} fill="url(#adminAreaGradient)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#0d6efd"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Render Bars or Dots */}
              {points.map((p, i) => {
                const isHovered = hoveredIndex === i;
                const barHeight = paddingTop + chartHeight - p.y;

                return (
                  <g
                    key={p.key || i}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartType === 'bar' ? (
                      <>
                        {/* Background hover column hit-area */}
                        <rect
                          x={p.x - barWidth}
                          y={paddingTop}
                          width={barWidth * 2}
                          height={chartHeight}
                          fill={isHovered ? 'rgba(13, 110, 253, 0.05)' : 'transparent'}
                          rx="4"
                        />
                        {/* Visible Bar */}
                        <rect
                          x={p.x - barWidth / 2}
                          y={p.count === 0 ? paddingTop + chartHeight - 2 : p.y}
                          width={barWidth}
                          height={p.count === 0 ? 2 : Math.max(barHeight, 2)}
                          fill={isHovered ? 'url(#adminBarHoverGradient)' : 'url(#adminBarGradient)'}
                          rx="4"
                          ry="4"
                        />
                        {/* Top count label when count > 0 or on hover */}
                        {(p.count > 0 || isHovered) && (
                          <text
                            x={p.x}
                            y={p.y - 7}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="bold"
                            fill={isHovered ? '#fd7e14' : '#0d6efd'}
                          >
                            {p.count}
                          </text>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Dot for Line Chart */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
                          fill={isHovered ? '#ffc107' : '#0d6efd'}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        {(p.count > 0 || isHovered) && (
                          <text
                            x={p.x}
                            y={p.y - 10}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight="bold"
                            fill={isHovered ? '#fd7e14' : '#0d6efd'}
                          >
                            {p.count}
                          </text>
                        )}
                      </>
                    )}

                    {/* X-axis label */}
                    <text
                      x={p.x}
                      y={height - 12}
                      textAnchor="middle"
                      fontSize="11"
                      fill={isHovered ? '#0d6efd' : '#64748b'}
                      fontWeight={isHovered ? '700' : '500'}
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div
                className="position-absolute bg-dark text-white p-2 rounded shadow-sm small pointer-events-none"
                style={{
                  top: '10px',
                  right: '16px',
                  zIndex: 5,
                  fontSize: '0.8rem',
                  minWidth: '150px'
                }}
              >
                <div className="fw-semibold text-warning">{points[hoveredIndex].fullLabel}</div>
                <div>
                  Số đăng ký: <strong>{points[hoveredIndex].count}</strong> tài khoản
                </div>
                {hoveredIndex > 0 && (
                  <div className="text-white-50 small">
                    Tăng trưởng:{' '}
                    <span className={points[hoveredIndex].growth >= 0 ? 'text-success' : 'text-danger'}>
                      {points[hoveredIndex].growth > 0
                        ? `+${points[hoveredIndex].growth}%`
                        : `${points[hoveredIndex].growth}%`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MonthlyRegistrationChart;
