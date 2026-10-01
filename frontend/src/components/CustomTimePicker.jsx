import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomTimePicker - Modern, sleek time picker component for TripMate
 * Replaces native browser time picker (which renders ugly native OS dialogs)
 * with a high-end, responsive custom picker matching the design system.
 *
 * Props:
 * - value: string 'HH:mm' (24-hour format, e.g. '08:30')
 * - onChange: function(syntheticEvent) -> syntheticEvent.target.value has 'HH:mm'
 * - id: string element ID
 * - name: string input name
 * - placeholder: string (default 'Chọn giờ (--:--)')
 * - disabled: boolean
 * - required: boolean
 * - className: string
 */
export default function CustomTimePicker({
  value = '',
  onChange,
  id,
  name,
  placeholder = '--:-- --',
  disabled = false,
  required = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  // Parse current value 'HH:mm'
  const parseTime = (val) => {
    if (!val || typeof val !== 'string' || !val.includes(':')) {
      return { hour: '', minute: '' };
    }
    const [h, m] = val.split(':');
    return {
      hour: h ? h.padStart(2, '0') : '',
      minute: m ? m.padStart(2, '0') : ''
    };
  };

  const { hour: currentHour, minute: currentMinute } = parseTime(value);

  // Hours: 00 to 23
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  // Minutes: 00 to 59
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Quick preset options
  const presets = [
    { label: '07:00 (Sáng)', val: '07:00' },
    { label: '08:00 (Sáng)', val: '08:00' },
    { label: '09:30 (Sáng)', val: '09:30' },
    { label: '12:00 (Trưa)', val: '12:00' },
    { label: '14:00 (Chiều)', val: '14:00' },
    { label: '16:30 (Chiều)', val: '16:30' },
    { label: '18:00 (Tối)', val: '18:00' },
    { label: '20:00 (Tối)', val: '20:00' }
  ];

  // Helper to emit onChange
  const emitChange = (newVal) => {
    if (disabled) return;
    if (onChange) {
      const syntheticEvent = {
        target: { id: id || name, name: name || id, value: newVal },
        currentTarget: { id: id || name, name: name || id, value: newVal },
        value: newVal,
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      onChange(syntheticEvent, newVal);
    }
  };

  const handleHourSelect = (h) => {
    const m = currentMinute || '00';
    emitChange(`${h}:${m}`);
  };

  const handleMinuteSelect = (m) => {
    const h = currentHour || '08';
    emitChange(`${h}:${m}`);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    emitChange('');
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    emitChange(`${h}:${m}`);
  };

  // Close on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
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

  // Scroll selected items into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourListRef.current && currentHour) {
          const selectedHourEl = hourListRef.current.querySelector('.is-selected');
          if (selectedHourEl) {
            selectedHourEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
        if (minuteListRef.current && currentMinute) {
          const selectedMinuteEl = minuteListRef.current.querySelector('.is-selected');
          if (selectedMinuteEl) {
            selectedMinuteEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }, 50);
    }
  }, [isOpen, currentHour, currentMinute]);

  // Display label formatting
  const getDisplayTime = () => {
    if (!value) return null;
    const { hour, minute } = parseTime(value);
    if (!hour || !minute) return value;
    const hNum = parseInt(hour, 10);
    const period = hNum >= 12 ? 'PM' : 'AM';
    const h12 = hNum % 12 === 0 ? 12 : hNum % 12;
    return (
      <span className="tm-time-display-val">
        <strong>{hour}:{minute}</strong>
        <span className="tm-time-period-tag ms-1">({String(h12).padStart(2, '0')}:{minute} {period})</span>
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`tm-custom-timepicker ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      <input
        type="hidden"
        id={id}
        name={name}
        value={value || ''}
        required={required}
      />

      {/* Trigger Button styled like a sleek form-control */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={`tm-timepicker-trigger form-control ${isOpen ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="tm-timepicker-val-wrap">
          <i className="bi bi-clock tm-timepicker-icon" aria-hidden="true"></i>
          {getDisplayTime() || (
            <span className="text-muted small tm-time-placeholder">{placeholder}</span>
          )}
        </div>

        <div className="d-flex align-items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              className="tm-time-clear-btn"
              onClick={handleClear}
              title="Xóa giờ"
              aria-label="Xóa giờ"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
          <i className={`bi bi-chevron-down tm-timepicker-arrow ${isOpen ? 'is-open' : ''}`}></i>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="tm-timepicker-dropdown" role="dialog" aria-modal="true">
          {/* Header */}
          <div className="tm-timepicker-header">
            <div className="tm-timepicker-title">
              <span className="small text-muted d-block">Thời gian đã chọn:</span>
              <span className="fw-bold text-primary fs-5">
                {currentHour ? currentHour : '--'}:{currentMinute ? currentMinute : '--'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary tm-time-now-btn"
              onClick={handleSetCurrentTime}
            >
              <i className="bi bi-clock-history me-1"></i>
              Hiện tại
            </button>
          </div>

          {/* Quick Presets */}
          <div className="tm-timepicker-presets">
            {presets.slice(0, 4).map((p) => (
              <button
                key={p.val}
                type="button"
                className={`tm-preset-chip ${value === p.val ? 'is-active' : ''}`}
                onClick={() => emitChange(p.val)}
              >
                {p.val}
              </button>
            ))}
          </div>

          {/* Time Picker Columns (Hour & Minute) */}
          <div className="tm-timepicker-columns">
            {/* Hours Column */}
            <div className="tm-time-col">
              <div className="tm-time-col-header">Giờ (00-23)</div>
              <div className="tm-time-col-list" ref={hourListRef}>
                {hours.map((h) => {
                  const isSelected = currentHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      className={`tm-time-cell ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleHourSelect(h)}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div className="tm-time-col-separator">:</div>

            {/* Minutes Column */}
            <div className="tm-time-col">
              <div className="tm-time-col-header">Phút (00-59)</div>
              <div className="tm-time-col-list" ref={minuteListRef}>
                {minutes.map((m) => {
                  const isSelected = currentMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`tm-time-cell ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleMinuteSelect(m)}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="tm-timepicker-footer">
            <button
              type="button"
              className="btn btn-sm btn-link text-secondary text-decoration-none px-2"
              onClick={() => {
                emitChange('');
                setIsOpen(false);
              }}
            >
              Xóa
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary px-3 rounded-pill"
              onClick={() => setIsOpen(false)}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
