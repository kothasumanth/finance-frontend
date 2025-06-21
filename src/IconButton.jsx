import React from 'react'

function IconButton({ icon, title, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: '#f3f4f6', // subtle gray
        border: '1.5px solid #6366f1', // indigo border
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: '1.2em',
        margin: '0 0.2em',
        padding: '0.3em 0.7em',
        transition: 'background 0.2s, border 0.2s',
        boxShadow: '0 1px 4px rgba(99,102,241,0.08)',
        ...style
      }}
      onMouseOver={e => e.currentTarget.style.background = '#e0e7ff'}
      onMouseOut={e => e.currentTarget.style.background = '#f3f4f6'}
    >
      {icon}
    </button>
  )
}

export default IconButton
