import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * CustomSelect - Reusable TripMate Dropdown Select Component
 * Replaces native OS select dropdown with a sleek, elevated custom UI.
 * Features React Portal to float cleanly over modals, popups, and tables
 * without getting clipped by overflow containers or modal footers.
 *
 * Props:
 * - options: Array of { value, label, icon, disabled } or Array of strings
 * - value: Current selected value
 * - onChange: Callback fired on change: (event, value) => void
 * - placeholder: String placeholder when no value is selected
 * - disabled: Boolean flag
 * - id: String element ID
 * - name: String form input name
 * - className: Additional container CSS classes
 * - triggerClassName: Additional CSS classes on trigger button
 * - style: Inline styles on container
 * - triggerStyle: Inline styles on trigger button
 * - required: Boolean flag for HTML form validation
 * - dropup: Boolean flag to force upward display
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Chọn...',
  disabled = false,
  id,
  name,
  className = '',
  triggerClassName = '',
  style,
  triggerStyle,
  required = false,
  dropup = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(Boolean(dropup));
  const [coords, setCoords] = useState(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Normalize options array
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt) };
    }
    return {
      value: opt.value !== undefined ? String(opt.value) : '',
      label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
      icon: opt.icon,
      disabled: Boolean(opt.disabled)
    };
  });

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Compute position and bounding coordinates
  const getCoords = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();

    // If trigger is detached or scrolled completely offscreen, close dropdown
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return null;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const shouldOpenUp = Boolean(dropup) || (spaceBelow < 180 && spaceAbove > spaceBelow);
    setOpenUpward(shouldOpenUp);

    const maxHeight = shouldOpenUp
      ? Math.min(260, Math.max(120, spaceAbove - 8))
      : Math.min(260, Math.max(120, spaceBelow - 8));

    let left = rect.left;
    let width = rect.width;

    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }
    if (left < 8) {
      left = 8;
      width = Math.min(width, viewportWidth - 16);
    }

    return {
      top: shouldOpenUp ? undefined : Math.round(rect.bottom + 4),
      bottom: shouldOpenUp ? Math.round(viewportHeight - rect.top + 4) : undefined,
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(maxHeight)
    };
  }, [dropup]);

  const updateCoords = useCallback(() => {
    const nextCoords = getCoords();
    if (!nextCoords) {
      setIsOpen(false);
      return;
    }
    setCoords(nextCoords);
  }, [getCoords]);

  // Sync coords synchronously before paint
  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen, updateCoords]);

  // Event listeners for window resize, scroll, outside click, and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (event) => {
      // Ignore scroll events coming from within the dropdown itself
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }
      updateCoords();
    };

    const handleResize = () => {
      updateCoords();
    };

    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
      window.removeEventListener('resize', handleResize, { passive: true });
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updateCoords]);

  // Scroll active option into view when dropdown is opened
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector('.is-selected');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    if (option.disabled || disabled) return;
    setIsOpen(false);
    if (onChange) {
      const syntheticEvent = {
        target: { name: name || id, value: option.value },
        currentTarget: { name: name || id, value: option.value },
        value: option.value,
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      onChange(syntheticEvent, option.value);
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      const nextCoords = getCoords();
      if (nextCoords) {
        setCoords(nextCoords);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`tm-custom-select ${className}`}
      id={id ? `${id}-container` : undefined}
      style={style}
    >
      {/* Hidden input for HTML form submission and native validation if needed */}
      <input
        type="hidden"
        name={name || id}
        value={value || ''}
        required={required}
      />

      <button
        type="button"
        id={id}
        name={name}
        className={`tm-select-trigger ${isOpen ? 'is-open' : ''} ${triggerClassName}`}
        style={triggerStyle}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="tm-select-value">
          {selectedOption ? (
            <>
              {selectedOption.icon && <i className={`${selectedOption.icon} me-1 text-primary`}></i>}
              <span className="text-truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="tm-select-placeholder">{placeholder}</span>
          )}
        </div>
        <i className="bi bi-chevron-down tm-select-arrow" aria-hidden="true"></i>
      </button>

      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`tm-select-dropdown ${openUpward ? 'is-dropup' : ''}`}
          role="listbox"
          tabIndex="-1"
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : 'auto',
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
            left: `${coords.left}px`,
            right: 'auto',
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            boxSizing: 'border-box',
            zIndex: 99999
          }}
        >
          {normalizedOptions.length === 0 ? (
            <div className="p-3 text-center text-muted small">Không có lựa chọn</div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
              return (
                <div
                  key={String(opt.value)}
                  className={`tm-select-option ${isSelected ? 'is-selected' : ''} ${opt.disabled ? 'is-disabled' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt)}
                >
                  <div className="d-flex align-items-center gap-2 text-truncate">
                    {opt.icon && <i className={`${opt.icon} ${isSelected ? 'text-primary' : 'text-muted'}`}></i>}
                    <span className="text-truncate">{opt.label}</span>
                  </div>
                  {isSelected && <i className="bi bi-check-lg tm-select-check ms-2"></i>}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
