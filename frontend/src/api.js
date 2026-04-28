const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`)
  }
  return data
}

const post = (url, body) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(readJson)

const patch = (url, body) =>
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(readJson)

export const api = {
  getStats: () => fetch(`${BASE}/stats`).then(readJson),

  // Volunteers
  getVolunteers: () => fetch(`${BASE}/volunteers`).then(readJson),
  createVolunteer: (data) => post(`${BASE}/volunteers`, data),

  // Tasks
  getTasks: () => fetch(`${BASE}/tasks`).then(readJson),
  parseTask: (raw_input) => post(`${BASE}/tasks/parse`, { raw_input }),
  createTask: (data) => post(`${BASE}/tasks`, data),

  // Matching
  matchTask: (taskId) => post(`${BASE}/tasks/${taskId}/match`, {}),
  assignVolunteer: (taskId, data) => post(`${BASE}/tasks/${taskId}/assign`, data),

  // Post-event
  updateAssignmentStatus: (assignmentId, status) =>
    patch(`${BASE}/assignments/${assignmentId}/status`, { status }),
}
