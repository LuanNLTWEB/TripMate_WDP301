import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomDatePicker - Modern, sleek Date Picker component for TripMate
 * Replaces native browser date picker with a branded, elevated UI.
 *
 * Props:
 * - value: string 'YYYY-MM-DD' (e.g. '2026-10-02')
 * - onChange: function(syntheticEvent, value) -> syntheticEvent.target.value has 'YYYY-MM-DD'
 * - min: string 'YYYY-MM-DD'
 * - max: string 'YYYY-MM-DD'
 * - id: string element ID
 * - name: string input name
 * - placeholder: string (default 'dd/mm/yyyy')
 * - disabled: boolean
 * - required: boolean
 * - className: string
 */
export default function CustomDatePicker({
  value = '',
  onChange,
  min,
  max,
  id,
  name,
  placeholder = 'dd/mm/yyyy',
  disabled = false,
  required = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const containerRef = useRef(null);

  // Parse initial view date
  const parseDate = (val) => {
    if (!val || typeof val !== 'string' || !val.includes('-')) return null;
    const [y, m, d] = val.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const selectedDate = parseDate(value);
  const today = new Date();

  // Calendar display state (viewYear, viewMonth: 0-11)
  const [viewYear, setViewYear] = useState(() => (selectedDate ? selectedDate.getFullYear() : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDate ? selectedDate.getMonth() : today.getMonth()));

  // Year range for 'years' view mode
  const [yearRangeStart, setYearRangeStart] = useState(() => Math.floor(viewYear / 12) * 12);

  // Sync view when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Helpers
  const formatISO = (y, m, d) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const isDateDisabled = (y, m, d) => {
    const iso = formatISO(y, m, d);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const emitChange = (isoString) => {
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: { id: id || name, name: name || id, value: isoString },
        currentTarget: { id: id || name, name: name || id, value: isoString },
        value: isoString,
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      onChange(syntheticEvent, isoString);
    }
  };

  const handleDaySelect = (y, m, d) => {
    if (isDateDisabled(y, m, d)) return;
    const iso = formatISO(y, m, d);
    emitChange(iso);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emitChange('');
  };

  const handleSelectToday = () => {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (!isDateDisabled(y, m, d)) {
      emitChange(formatISO(y, m, d));
      setViewYear(y);
      setViewMonth(m);
      setIsOpen(false);
    }
  };

  // Month navigation
  const prevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Outside click & Escape handlers
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setViewMode('days');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Months array
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  // Weekdays in Vietnamese (Monday to Sunday)
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Calculate calendar days
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => {
    const day = new Date(y, m, 1).getDay();
    // Convert Sunday (0) to 6, Monday (1) to 0
    return day === 0 ? 6 : day - 1;
  };

  const currentMonthDays = daysInMonth(viewYear, viewMonth);
  const prevMonthDays = daysInMonth(viewYear, viewMonth - 1);
  const startDay = firstDayOfMonth(viewYear, viewMonth);

  // Cells array for grid
  const calendarCells = [];

  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({ day: d, month: m, year: y, isOtherMonth: true, disabled: isDateDisabled(y, m, d) });
  }

  // Current month days
  for (let d = 1; d <= currentMonthDays; d++) {
    const isSelected =
      selectedDate &&
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === d;
    const isToday =
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === d;

    calendarCells.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isOtherMonth: false,
      isSelected,
      isToday,
      disabled: isDateDisabled(viewYear, viewMonth, d)
    });
  }

  // Next month padding to fill grid (total multiple of 7, usually 35 or 42)
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({ day: d, month: m, year: y, isOtherMonth: true, disabled: isDateDisabled(y, m, d) });
  }

  // Formatted display date (dd/mm/yyyy)
  const formattedDisplay = () => {
    if (!selectedDate) return null;
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const y = selectedDate.getFullYear();
    return `${d}/${m}/${y}`;
  };

  return (
    <div
      ref={containerRef}
      className={`tm-custom-datepicker ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      <input
        type="hidden"
        id={id}
        name={name}
        value={value || ''}
        required={required}
      />

      {/* Trigger Form-Control input */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`tm-datepicker-trigger form-control ${isOpen ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="tm-datepicker-val-wrap">
          <i className="bi bi-calendar3 tm-datepicker-icon" aria-hidden="true"></i>
          {formattedDisplay() ? (
            <span className="fw-semibold text-dark">{formattedDisplay()}</span>
          ) : (
            <span className="text-muted small tm-datepicker-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="d-flex align-items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              className="tm-datepicker-clear-btn"
              onClick={handleClear}
              title="Xóa ngày"
              aria-label="Xóa ngày"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
          <i className={`bi bi-chevron-down tm-datepicker-arrow ${isOpen ? 'is-open' : ''}`}></i>
        </div>
      </div>

      {/* Floating Popover Calendar */}
      {isOpen && (
        <div className="tm-datepicker-dropdown" role="dialog" aria-modal="true">
          {/* Header with Month/Year Navigation */}
          <div className="tm-datepicker-header">
            {viewMode === 'days' && (
              <>
                <button
                  type="button"
                  className="tm-datepicker-nav-btn"
                  onClick={prevMonth}
                  title="Tháng trước"
                  aria-label="Tháng trước"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <div className="tm-datepicker-title-wrap">
                  <button
                    type="button"
                    className="tm-datepicker-title-btn"
                    onClick={() => setViewMode('months')}
                  >
                    {monthNames[viewMonth]} {viewYear}
                    <i className="bi bi-caret-down-fill ms-1 small opacity-75"></i>
                  </button>
                </div>

                <button
                  type="button"
                  className="tm-datepicker-nav-btn"
                  onClick={nextMonth}
                  title="Tháng sau"
                  aria-label="Tháng sau"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </>
            )}

            {viewMode === 'months' && (
              <div className="d-flex justify-content-between align-items-center w-100">
                <button
                  type="button"
                  className="tm-datepicker-nav-btn"
                  onClick={() => setViewYear((y) => y - 1)}
                  title="Năm trước"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button
                  type="button"
                  className="tm-datepicker-title-btn"
                  onClick={() => {
                    setYearRangeStart(Math.floor(viewYear / 12) * 12);
                    setViewMode('years');
                  }}
                >
                  Năm {viewYear}
                  <i className="bi bi-caret-down-fill ms-1 small opacity-75"></i>
                </button>
                <button
                  type="button"
                  className="tm-datepicker-nav-btn"
                  onClick={() => setViewYear((y) => y + 1)}
                  title="Năm sau"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}

            {viewMode === 'years' && (
              <div className="d-flex justify-content-between align-items-center w-100">
                <button
                  type="button"
                  className="tm-datepicker-nav-btn"
                  onClick={() => setYearRangeStart((y) => y - 12)}
                  title="12 năm trước"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <span className="fw-bold text-dark small">
                  {yearRangeStart} – {yearRangeStart + 11}
                </span>
                <button
                  type="button"
                  className="tm-datepicker-nav-btn"
                  onClick={() => setYearRangeStart((y) => y + 12)}
                  title="12 năm sau"
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            )}
          </div>

          {/* VIEW: Month selector grid */}
          {viewMode === 'months' && (
            <div className="tm-datepicker-grid-months">
              {monthNames.map((mName, mIdx) => (
                <button
                  key={mName}
                  type="button"
                  className={`tm-datepicker-month-chip ${mIdx === viewMonth ? 'is-selected' : ''}`}
                  onClick={() => {
                    setViewMonth(mIdx);
                    setViewMode('days');
                  }}
                >
                  {mName}
                </button>
              ))}
            </div>
          )}

          {/* VIEW: Year selector grid */}
          {viewMode === 'years' && (
            <div className="tm-datepicker-grid-years">
              {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`tm-datepicker-year-chip ${yr === viewYear ? 'is-selected' : ''}`}
                  onClick={() => {
                    setViewYear(yr);
                    setViewMode('months');
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {/* VIEW: Standard Days Grid */}
          {viewMode === 'days' && (
            <>
              {/* Weekday headers */}
              <div className="tm-datepicker-weekdays">
                {weekDays.map((wd, i) => (
                  <div key={wd} className={`tm-datepicker-weekday ${i === 6 ? 'text-danger' : ''}`}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="tm-datepicker-days-grid">
                {calendarCells.map((cell, idx) => (
                  <button
                    key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                    type="button"
                    disabled={cell.disabled}
                    className={`tm-datepicker-day-cell ${cell.isOtherMonth ? 'is-other-month' : ''} ${cell.isSelected ? 'is-selected' : ''} ${cell.isToday && !cell.isSelected ? 'is-today' : ''} ${cell.disabled ? 'is-disabled' : ''}`}
                    onClick={() => handleDaySelect(cell.year, cell.month, cell.day)}
                  >
                    {cell.day}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Quick Actions Footer */}
          <div className="tm-datepicker-footer">
            <button
              type="button"
              className="btn btn-sm btn-link text-secondary text-decoration-none px-1"
              onClick={handleClear}
            >
              Xóa
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-primary px-3 rounded-pill"
              onClick={handleSelectToday}
            >
              Hôm nay
            </button>

            <button
              type="button"
              className="btn btn-sm btn-primary px-3 rounded-pill"
              onClick={() => setIsOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
