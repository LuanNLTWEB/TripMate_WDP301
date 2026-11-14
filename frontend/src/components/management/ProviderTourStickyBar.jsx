import { TOUR_DETAIL_TABS } from '../../utils/providerTourDetailsHelpers';

/**
 * Fixed-size icon action button: reveals label via floating tooltip on hover/focus
 * without changing button width (prevents layout jitter when moving between icons).
 */
function HoverLabelIconButton({ icon, label, variant = 'outline-secondary', onClick, disabled = false }) {
  return (
    <button
      type="button"
      className={`btn btn-sm btn-${variant} provider-tour-icon-btn`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <i className={`bi ${icon}`} aria-hidden="true"></i>
      <span className="provider-tour-icon-tooltip" role="tooltip">
        {label}
      </span>
    </button>
  );
}

/**
 * Sticky Tour Action Bar: left section tabs + right hover-expand icon bar and unified Save.
 */
export default function ProviderTourStickyBar({
  activeTab,
  onSelectTab,
  tabMeta,
  dirtyState,
  allVisibleOpen,
  onToggleAllVisible,
  onEditInfo,
  onEditPrice,
  onOpenSchedule,
  onCreateDeparture,
  onSaveAll,
  savingAll
}) {
  const getTabHasDirty = (tabId) => {
    if (tabId === 'content') return dirtyState.isDetailsDirty;
    if (tabId === 'operations') return dirtyState.isCapacityDirty;
    if (tabId === 'all') return dirtyState.hasAnyDirty;
    return false;
  };

  return (
    <div className="provider-tour-sticky-bar p-2 p-md-3 mb-4" role="region" aria-label="Thanh điều hướng và thao tác nhanh chi tiết tour">
      <div className="d-flex flex-column flex-xl-row align-items-stretch align-items-xl-center justify-content-between gap-2 gap-xl-3">
        {/* Left: Compact Tab Pills */}
        <div className="provider-tour-tabs nav nav-pills flex-nowrap overflow-auto gap-1 pb-1 pb-xl-0" role="tablist">
          {TOUR_DETAIL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const metaText = tabMeta?.[tab.id];
            const hasDirty = getTabHasDirty(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTab(tab.id)}
                className={`provider-tour-tab-btn btn btn-sm rounded-pill d-inline-flex align-items-center gap-2 flex-shrink-0 ${
                  isActive ? 'is-active' : ''
                }`}
              >
                <i className={`bi ${tab.icon}`}></i>
                <span>{tab.label}</span>
                {metaText && (
                  <span className={`badge rounded-pill ${isActive ? 'bg-white text-primary' : 'bg-light text-secondary border'}`} style={{ fontSize: '0.7rem' }}>
                    {metaText}
                  </span>
                )}
                {hasDirty && (
                  <span
                    className="provider-tour-dirty-dot"
                    title="Có thay đổi chưa lưu trong mục này"
                    aria-label="Chưa lưu"
                  ></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Tour Icon Bar (hover reveals name via floating tooltip) + Unified Save Button */}
        <div className="provider-tour-bar-actions d-flex align-items-center justify-content-between justify-content-xl-end gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2 flex-wrap" role="toolbar" aria-label="Chức năng nhanh">
            <HoverLabelIconButton
              icon="bi-pencil-square"
              label="Cập nhật thông tin tour"
              onClick={onEditInfo}
            />
            <HoverLabelIconButton
              icon="bi-currency-dollar"
              label="Sửa giá tour"
              onClick={onEditPrice}
            />
            <HoverLabelIconButton
              icon="bi-calendar-range"
              label="Chỉnh sửa lịch trình"
              onClick={onOpenSchedule}
            />
            <HoverLabelIconButton
              icon="bi-calendar-plus"
              label="Tạo lịch khởi hành"
              onClick={onCreateDeparture}
            />
            <HoverLabelIconButton
              icon={allVisibleOpen ? 'bi-arrows-collapse' : 'bi-arrows-expand'}
              label={allVisibleOpen ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              onClick={onToggleAllVisible}
            />
          </div>

          {(dirtyState.hasAnyDirty || savingAll) && (
            <button
              type="button"
              className="btn btn-sm btn-primary px-3 py-1.5 rounded-pill d-inline-flex align-items-center gap-2 fw-semibold shadow-sm flex-shrink-0 ms-auto ms-xl-1"
              onClick={onSaveAll}
              disabled={savingAll}
              title="Lưu các thay đổi (Dịch vụ, Chính sách & Số chỗ)"
            >
              {savingAll ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle"></i>
                  <span>Lưu thay đổi</span>
                  <span className="badge rounded-pill bg-warning text-dark">
                    {dirtyState.dirtyCount}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
