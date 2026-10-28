import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Type to search funds',
  emptyOptionLabel,
  noMatchesLabel = 'No matching funds',
  emptyValue = '',
  ariaLabel,
  id,
  disabled = false,
  maxSuggestions = 8,
  wrapperStyle,
  inputStyle,
}) {
  const listboxId = useId()
  const inputRef = useRef(null)
  const [searchText, setSearchText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState(null)
  const selectedOption = options.find(option => String(option.value) === String(value))
  const filteredOptions = options
    .filter(option => option.label.toLowerCase().includes(searchText.trim().toLowerCase()))
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label))

  const updateDropdownPosition = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownPosition({ left: rect.left, top: rect.bottom + 4, width: rect.width })
  }

  useEffect(() => {
    if (!isOpen) return undefined
    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)
    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [isOpen])

  const selectOption = selectedValue => {
    onChange(selectedValue)
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%', ...wrapperStyle }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        value={isOpen ? searchText : selectedOption?.label || (String(value) === String(emptyValue) ? emptyOptionLabel || '' : '')}
        onChange={event => setSearchText(event.target.value)}
        onFocus={() => {
          setSearchText('')
          setIsOpen(true)
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={event => {
          if (event.key === 'Escape') setIsOpen(false)
          if (event.key === 'Enter' && isOpen) {
            event.preventDefault()
            if (filteredOptions[0]) selectOption(filteredOptions[0].value)
            else if (emptyOptionLabel) selectOption(emptyValue)
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontWeight: 600,
          color: '#2563eb',
          fontSize: '1rem',
          border: '1.5px solid #059669',
          borderRadius: 6,
          padding: '0.5rem 1rem',
          fontFamily: 'monospace',
          background: '#fff',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          ...inputStyle,
        }}
      />
      {isOpen && !disabled && dropdownPosition && createPortal(
        <div id={listboxId} role="listbox" style={{
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          maxHeight: 220,
          overflowY: 'auto',
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.14)',
          zIndex: 1001,
        }}>
          {emptyOptionLabel && (
            <button
              type="button"
              role="option"
              aria-selected={String(value) === String(emptyValue)}
              onMouseDown={event => {
                event.preventDefault()
                selectOption(emptyValue)
              }}
              style={optionStyle}
            >
              {emptyOptionLabel}
            </button>
          )}
          {filteredOptions.slice(0, maxSuggestions).map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={String(value) === String(option.value)}
              onMouseDown={event => {
                event.preventDefault()
                selectOption(option.value)
              }}
              style={optionStyle}
            >
              {option.label}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontSize: '0.9rem' }}>
              {noMatchesLabel}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

const optionStyle = {
  display: 'block',
  width: '100%',
  padding: '0.6rem 0.75rem',
  border: 'none',
  borderBottom: '1px solid #f1f5f9',
  background: '#fff',
  color: '#1e293b',
  textAlign: 'left',
  fontSize: '0.9rem',
  cursor: 'pointer',
}