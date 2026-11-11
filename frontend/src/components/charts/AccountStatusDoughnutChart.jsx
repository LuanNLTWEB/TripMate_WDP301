import { useState } from 'react';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(centerX, centerY, radius, innerRadius, startAngle, endAngle) {
  // Clamp endAngle to slightly less than 360 to prevent SVG 0-length arc issues
  const adjustedEndAngle = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
  const start = polarToCartesian(centerX, centerY, radius, adjustedEndAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, adjustedEndAngle);

  const arcSweep = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

  if (innerRadius <= 0) {
    // Pie slice
    return [
      'M', centerX, centerY,
      'L', start.x, start.y,
      'A', radius, radius, 0, arcSweep, 0, end.x, end.y,
      'Z'
    ].join(' ');
  }

  // Doughnut slice
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, arcSweep, 0, end.x, end.y,
    'L', innerStart.x, innerStart.y,
    'A', innerRadius, innerRadius, 0, arcSweep, 1, innerEnd.x, innerEnd.y,
    'Z'
  ].join(' ');
}

function AccountStatusDoughnutChart({ summary }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [chartMode, setChartMode] = useState('doughnut'); // 'doughnut' | 'pie'

  const active = summary?.activeAccounts ?? 0;
  const disabled = summary?.disabledAccounts ?? 0;
  const total = summary?.totalAccounts ?? (active + disabled);
  const activePercentage = summary?.activePercentage ?? (total > 0 ? ((active / total) * 100).toFixed(1) : 0);
  const disabledPercentage = summary?.disabledPercentage ?? (total > 0 ? ((disabled / total) * 100).toFixed(1) : 0);

  const centerX = 120;
  const centerY = 120;
  const outerRadius = 95;
  const innerRadius = chartMode === 'doughnut' ? 62 : 0;

  // Compute angle for active slice (disabled slice takes the rest up to 360)
  const activeAngle = total > 0 ? (active / total) * 360 : 360;

  const activePath = total > 0 && active > 0
    ? describeArc(centerX, centerY, outerRadius, innerRadius, 0, activeAngle)
    : '';

  const disabledPath = total > 0 && disabled > 0
    ? describeArc(centerX, centerY, outerRadius, innerRadius, activeAngle, 360)
    : '';

  return (
    <div className="management-table-card h-100">
      <div className="p-4 d-flex flex-column justify-content-between h-100">
        <div>
          {/* Card Header & Controls */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span className="badge bg-success-subtle text-success mb-1">
                <i className="bi bi-shield-check me-1"></i>Trạng thái
              </span>
              <h2 className="h5 fw-bold mb-0">Tỷ lệ trạng thái tài khoản</h2>
            </div>

            <div className="btn-group btn-group-sm" role="group" aria-label="Kiểu biểu đồ tròn">
              <button
                type="button"
                className={`btn ${chartMode === 'doughnut' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setChartMode('doughnut')}
                title="Doughnut Chart"
              >
                <i className="bi bi-circle"></i>
              </button>
              <button
                type="button"
                className={`btn ${chartMode === 'pie' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setChartMode('pie')}
                title="Pie Chart"
              >
                <i className="bi bi-pie-chart-fill"></i>
              </button>
            </div>
          </div>

          <p className="text-muted small mb-3">
            Phân bổ trạng thái hoạt động của toàn bộ tài khoản trong hệ thống
          </p>

          {/* SVG Doughnut / Pie */}
          <div className="d-flex justify-content-center align-items-center position-relative my-3">
            <svg
              width="240"
              height="240"
              viewBox="0 0 240 240"
              aria-label="Biểu đồ tỷ lệ tài khoản hoạt động và vô hiệu hóa"
            >
              {total === 0 ? (
                /* Empty state ring */
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={outerRadius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="24"
                />
              ) : (
                <>
                  {/* Active Slice */}
                  {active > 0 && (
                    <path
                      d={activePath}
                      fill={hoveredSlice === 'active' ? '#20c997' : '#198754'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                      onMouseEnter={() => setHoveredSlice('active')}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )}

                  {/* Disabled Slice */}
                  {disabled > 0 && (
                    <path
                      d={disabledPath}
                      fill={hoveredSlice === 'disabled' ? '#e05362' : '#dc3545'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                      onMouseEnter={() => setHoveredSlice('disabled')}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )}
                </>
              )}

              {/* Center cutout text for Doughnut mode */}
              {chartMode === 'doughnut' && (
                <g pointerEvents="none">
                  <text
                    x={centerX}
                    y={centerY - 6}
                    textAnchor="middle"
                    fontSize="24"
                    fontWeight="800"
                    fill="#1e293b"
                  >
                    {hoveredSlice === 'active'
                      ? active
                      : hoveredSlice === 'disabled'
                      ? disabled
                      : total}
                  </text>
                  <text
                    x={centerX}
                    y={centerY + 16}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="500"
                    fill="#64748b"
                  >
                    {hoveredSlice === 'active'
                      ? 'Hoạt động'
                      : hoveredSlice === 'disabled'
                      ? 'Vô hiệu hóa'
                      : 'Tổng tài khoản'}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Legend & Breakdown Details */}
        <div className="vstack gap-2 pt-2 border-top">
          {/* Active Row */}
          <div
            className={`d-flex justify-content-between align-items-center p-2 rounded-3 ${
              hoveredSlice === 'active' ? 'bg-success-subtle' : ''
            }`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredSlice('active')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="d-flex align-items-center gap-2">
              <span
                className="d-inline-block rounded-circle"
                style={{ width: '12px', height: '12px', backgroundColor: '#198754' }}
              ></span>
              <span className="fw-medium small">Đang hoạt động</span>
            </div>
            <div className="text-end">
              <span className="fw-bold text-success me-2">{active}</span>
              <span className="badge bg-success rounded-pill">{activePercentage}%</span>
            </div>
          </div>

          {/* Disabled Row */}
          <div
            className={`d-flex justify-content-between align-items-center p-2 rounded-3 ${
              hoveredSlice === 'disabled' ? 'bg-danger-subtle' : ''
            }`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredSlice('disabled')}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="d-flex align-items-center gap-2">
              <span
                className="d-inline-block rounded-circle"
                style={{ width: '12px', height: '12px', backgroundColor: '#dc3545' }}
              ></span>
              <span className="fw-medium small">Đã vô hiệu hóa</span>
            </div>
            <div className="text-end">
              <span className="fw-bold text-danger me-2">{disabled}</span>
              <span className="badge bg-danger rounded-pill">{disabledPercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountStatusDoughnutChart;
