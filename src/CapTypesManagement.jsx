import React, { useState, useEffect } from 'react';
import { fetchCapTypes, createCapType, updateCapType, deleteCapType } from './api/capTypes';

export default function CapTypesManagement({ show, onClose }) {
    const [capTypes, setCapTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newCapTypeName, setNewCapTypeName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (show) {
            loadCapTypes();
        }
    }, [show]);

    const loadCapTypes = async () => {
        try {
            setLoading(true);
            const data = await fetchCapTypes();
            setCapTypes(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        try {
            const newCapType = await createCapType(newCapTypeName);
            setCapTypes([...capTypes, newCapType]);
            setNewCapTypeName('');
            setShowAddForm(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUpdate = async (id) => {
        try {
            const updatedCapType = await updateCapType(id, newCapTypeName);
            setCapTypes(capTypes.map(ct => ct._id === id ? updatedCapType : ct));
            setEditingId(null);
            setNewCapTypeName('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteCapType(id);
            setCapTypes(capTypes.filter(ct => ct._id !== id));
            setShowDeleteConfirm(false);
            setDeletingId(null);
        } catch (err) {
            setError(err.message);
        }
    };

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '500px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: '#1f2937' }}>Cap Types</h2>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.5rem'
                    }}>×</button>
                </div>

                {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                <button 
                    onClick={() => setShowAddForm(true)}
                    style={{
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        marginBottom: '1rem',
                        cursor: 'pointer'
                    }}
                >
                    Add New Cap Type
                </button>

                {showAddForm && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                        <input
                            type="text"
                            value={newCapTypeName}
                            onChange={(e) => setNewCapTypeName(e.target.value)}
                            placeholder="Enter cap type name"
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                marginBottom: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={handleAdd}
                                style={{
                                    background: '#6366f1',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Save
                            </button>
                            <button 
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewCapTypeName('');
                                }}
                                style={{
                                    background: '#f3f4f6',
                                    border: '1px solid #e5e7eb',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {capTypes.map((capType) => (
                            <div 
                                key={capType._id} 
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    borderBottom: '1px solid #e5e7eb'
                                }}
                            >
                                {editingId === capType._id ? (
                                    <div style={{ flex: 1, marginRight: '1rem' }}>
                                        <input
                                            type="text"
                                            value={newCapTypeName}
                                            onChange={(e) => setNewCapTypeName(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                borderRadius: '4px',
                                                border: '1px solid #e5e7eb'
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <span>{capType.name}</span>
                                )}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {editingId === capType._id ? (
                                        <>
                                            <button
                                                onClick={() => handleUpdate(capType._id)}
                                                style={{
                                                    background: '#6366f1',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(null);
                                                    setNewCapTypeName('');
                                                }}
                                                style={{
                                                    background: '#f3f4f6',
                                                    border: '1px solid #e5e7eb',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingId(capType._id);
                                                    setNewCapTypeName(capType.name);
                                                }}
                                                style={{
                                                    background: '#6366f1',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeletingId(capType._id);
                                                    setShowDeleteConfirm(true);
                                                }}
                                                style={{
                                                    background: '#ef4444',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '0.3rem 0.8rem',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showDeleteConfirm && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1001
                    }}>
                        <div style={{
                            background: 'white',
                            padding: '2rem',
                            borderRadius: '8px',
                            width: '90%',
                            maxWidth: '400px'
                        }}>
                            <h3 style={{ marginTop: 0 }}>Confirm Delete</h3>
                            <p>Are you sure you want to delete this cap type?</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletingId(null);
                                    }}
                                    style={{
                                        background: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deletingId)}
                                    style={{
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
