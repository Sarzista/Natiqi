const API_BASE = 'http://localhost:5000';

// Fetch all users (admin, specialist, registereduser)
export const getUsers = async () => {
  const res = await fetch(`${API_BASE}/admin/users`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
  return data;
};

// Add a new user
export const addUser = async (user: {
  national_id:        string;
  name:               string;
  email:              string;
  role:               'Admin' | 'Specialist';
  gender:             'Male' | 'Female';
  performed_by_name:  string;   // logged-in admin's name
  performed_by_id:    string;   // logged-in admin's national_id
}) => {
  const res = await fetch(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add user');
  return data;
};

// Edit a user
export const editUser = async (
  nationalId: string,
  updates: {
    name:               string;
    email:              string;
    role:               string;
    performed_by_name:  string;
    performed_by_id:    string;
  }
) => {
  const res = await fetch(`${API_BASE}/admin/users/${nationalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to edit user');
  return data;
};

// Delete a user
export const deleteUser = async (
  nationalId:        string,
  role:              string,
  performed_by_name: string,
  performed_by_id:   string,
) => {
  const res = await fetch(`${API_BASE}/admin/users/${nationalId}?role=${role}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performed_by_name, performed_by_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete user');
  return data;
};