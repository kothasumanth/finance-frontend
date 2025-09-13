const API_BASE_URL = 'http://localhost:3000';

export const fetchCapTypes = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mfcaptypes`);
        if (!response.ok) throw new Error('Failed to fetch cap types');
        return await response.json();
    } catch (error) {
        console.error('Error fetching cap types:', error);
        throw error;
    }
};

export const createCapType = async (name) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mfcaptypes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create cap type');
        return await response.json();
    } catch (error) {
        console.error('Error creating cap type:', error);
        throw error;
    }
};

export const updateCapType = async (id, name) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mfcaptypes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to update cap type');
        return await response.json();
    } catch (error) {
        console.error('Error updating cap type:', error);
        throw error;
    }
};

export const deleteCapType = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/mfcaptypes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete cap type');
        return await response.json();
    } catch (error) {
        console.error('Error deleting cap type:', error);
        throw error;
    }
};
