import { getApiBase } from '../config/apiBase';

export const getPatients = async (specialistId?: string) => {
  const url = specialistId
    ? `${getApiBase()}/specialist/patients?specialist_id=${specialistId}`
    : `${getApiBase()}/specialist/patients`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch patients');
  return data;
};

export const addPatient = async (patient: {
  national_id:        string;
  room_number:        string;
  name:               string;
  dob:                string;
  gender:             'Male' | 'Female';
  specialist_id?:     string;
  performed_by_name:  string;   // logged-in specialist's name
  performed_by_id:    string;   // logged-in specialist's national_id
}) => {
  const res = await fetch(`${getApiBase()}/specialist/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patient),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add patient');
  return data;
};

export const editPatient = async (
  nationalId: string,
  updates: {
    room_number:        string;
    name:               string;
    dob:                string;
    gender:             string;
    performed_by_name:  string;
    performed_by_id:    string;
  }
) => {
  const res = await fetch(`${getApiBase()}/specialist/patients/${nationalId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to edit patient');
  return data;
};

export const deletePatient = async (
  nationalId:        string,
  performed_by_name: string,
  performed_by_id:   string,
) => {
  const res = await fetch(`${getApiBase()}/specialist/patients/${nationalId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performed_by_name, performed_by_id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete patient');
  return data;
};