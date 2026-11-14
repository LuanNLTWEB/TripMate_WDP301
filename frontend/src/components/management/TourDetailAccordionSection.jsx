/**
 * Collapsible management section card aligned with TripMate TourCompare section styling.
 */
export default function TourDetailAccordionSection({
  id,
  title,
  icon,
  iconVariant = 'primary',
  isOpen,
  onToggle,
  summaryBadges = [],
  isDirty = false,
  headerActions = null,
  children
}) {
  const iconBadgeClass = iconVariant === 'warning'
    ? 'bg-warning text-dark'
    : iconVariant === 'success'
      ? 'bg-success'
      : iconVariant === 'info'
        ? 'bg-info text-dark'
        : '';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div id={id} className="tm-detail-accordion-card card border-0 shadow-sm rounded-4 mb-4">
      <div
        className="tm-detail-accordion-header"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        title={isOpen ? `Thu gọn mục ${title}` : `Mở rộng mục ${title}`}
      >
        <div className="d-flex align-items-center gap-2 flex-wrap min-w-0">
          <span className={`tm-compare-section-badge ${iconBadgeClass}`}>
            <i className={`bi ${icon}`}></i>
          </span>
          <span className="tm-compare-section-title text-truncate">{title}</span>
          {summaryBadges.map((badge, idx) => (
            <span
              key={idx}
              className={`badge rounded-pill fw-semibold ${badge.className || 'bg-light text-secondary border'}`}
              style={{ fontSize: '0.72rem' }}
            >
              {badge.text}
            </span>
          ))}
          {isDirty && (
            <span
              className="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle fw-semibold"
              style={{ fontSize: '0.72rem' }}
            >
              <i className="bi bi-dot me-0"></i>Chưa lưu
            </span>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
          {headerActions && (
            <div onClick={(e) => e.stopPropagation()} className="d-flex align-items-center gap-2">
              {headerActions}
            </div>
          )}
          <span className={`tm-compare-section-toggle ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
            <i className="bi bi-chevron-down"></i>
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="tm-detail-accordion-body p-3 p-md-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
