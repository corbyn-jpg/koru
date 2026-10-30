// Base URL for the authentication endpoints exposed by the ASP.NET backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";

// Shared response handler – unwraps JSON and surfaces backend error messages
async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// POST /api/User/login – sign an existing user into the platform
// The expectedRole is checked client-side against the backend response
// to ensure users log in via the correct portal (student/teacher/admin)
export async function loginUser({ email, password, expectedRole }) {
  const res = await fetch(`${API_BASE}/User/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse(res);

  // When 2FA is required the response only has requiresTwoFactor + pendingUserId,
  // so skip the role guard and let login.jsx handle the next step.
  if (data.requiresTwoFactor) return data;

  // Role guard – the backend returns the user's actual role; reject
  // if it doesn't match the portal they used to sign in
  if (expectedRole && data.role?.toLowerCase() !== expectedRole.toLowerCase()) {
    throw new Error(
      `This account is registered as a ${data.role}. Please use the correct login portal.`
    );
  }

  return data;
}

// PUT /api/User/profile/:id – update the user's profile information from settings
export async function updateUserProfile(id, payload) {
  const res = await fetch(`${API_BASE}/User/profile/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

// POST /api/User/change-password/:id – change the user's password after verifying the current one
export async function changeUserPassword(id, payload) {
  const res = await fetch(`${API_BASE}/User/change-password/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

// POST /api/User/google – exchange a Google credential for an app session
export async function loginWithGoogle(credential, role = "student") {
  const res = await fetch(`${API_BASE}/User/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, role }),
  });

  return handleResponse(res);
}

// GET /api/User/2fa/setup/:userId – generate a new TOTP secret and QR code URI
export async function setup2FA(userId) {
  const res = await fetch(`${API_BASE}/User/2fa/setup/${encodeURIComponent(userId)}`);
  return handleResponse(res);
}

// POST /api/User/2fa/enable – verify code and activate 2FA for the user
export async function enable2FA(userId, code) {
  const res = await fetch(`${API_BASE}/User/2fa/enable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  return handleResponse(res);
}

// POST /api/User/2fa/disable – verify code and deactivate 2FA for the user
export async function disable2FA(userId, code) {
  const res = await fetch(`${API_BASE}/User/2fa/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  return handleResponse(res);
}

// POST /api/User/2fa/validate – exchange a valid TOTP code for a full session during login
export async function validate2FA(userId, code) {
  const res = await fetch(`${API_BASE}/User/2fa/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  return handleResponse(res);
}


// GET /api/User/{id}/export – everything Koru stores about this user, as one JSON file (POPIA access request)
export async function downloadMyData(userId) {
  const res = await fetch(`${API_BASE}/User/${encodeURIComponent(userId)}/export`);
  const data = await handleResponse(res);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `koru-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
