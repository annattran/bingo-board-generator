// api.js
export async function apiFetch(endpoint, method = 'GET', body = null, token = '') {
    const headers = {
        'Authorization': `Bearer ${token}`,
    };
    if (body) headers['Content-Type'] = 'application/json';

    const response = await fetch(`/.netlify/functions/${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
}
  