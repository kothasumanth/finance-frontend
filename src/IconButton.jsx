import React from 'react'

function IconButton({ icon, title, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: '#f3f4f6', // subtle gray
        border: '1px solid #6366f1', // thinner indigo border
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: '1rem',
        margin: '0 0.15em',
        padding: '0.2em 0.4em',
        transition: 'all 0.2s',
        boxShadow: '0 1px 2px rgba(99,102,241,0.08)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 'auto',
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
