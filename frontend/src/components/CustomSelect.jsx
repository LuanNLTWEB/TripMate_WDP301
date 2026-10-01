import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomSelect - Reusable TripMate Dropdown Select Component
 * Replaces native OS select dropdown with a sleek, elevated custom UI.
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
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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

  // Close dropdown on outside click
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
    setIsOpen((prev) => !prev);
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

      {isOpen && (
        <div className="tm-select-dropdown" role="listbox" tabIndex="-1">
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
        </div>
      )}
    </div>
  );
}
