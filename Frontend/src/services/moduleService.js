const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";

// Shared response handler – unwraps JSON and surfaces backend error messages
async function handleResponse(res) {
  const data = await res.text().then(text => text ? JSON.parse(text) : {}).catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed.");
  }
  return data;
}

// ─── Module Sections ────────────────────────────────────────────────────────

// GET /api/CourseModule/course/{courseId} – all sections (with nested items) for a course
export async function getCourseModules(courseId) {
  const res = await fetch(`${API_BASE}/CourseModule/course/${encodeURIComponent(courseId)}`);
  return handleResponse(res);
}

// GET /api/CourseModule/{id} – single module section (with nested items)
export async function getModuleById(id) {
  const res = await fetch(`${API_BASE}/CourseModule/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

// POST /api/CourseModule – create a new module section
export async function createModule(data) {
  const res = await fetch(`${API_BASE}/CourseModule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// PUT /api/CourseModule/{id} – update a module section's metadata
export async function updateModule(id, data) {
  const res = await fetch(`${API_BASE}/CourseModule/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// PUT /api/CourseModule/{id}/content – save NovelEditor page content for a module's own page
export async function updateModuleContent(id, content) {
  const res = await fetch(`${API_BASE}/CourseModule/${encodeURIComponent(id)}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return handleResponse(res);
}

// DELETE /api/CourseModule/{id} – remove a section and all its nested items
export async function deleteModule(id) {
  const res = await fetch(`${API_BASE}/CourseModule/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

// ─── Module Items ────────────────────────────────────────────────────────────

// GET /api/CourseModuleItem/{id} – single item by ID
export async function getModuleItem(id) {
  const res = await fetch(`${API_BASE}/CourseModuleItem/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

// POST /api/CourseModuleItem – create a new item inside a module section
export async function createModuleItem(data) {
  const res = await fetch(`${API_BASE}/CourseModuleItem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// PUT /api/CourseModuleItem/{id} – update an item's label, type, or publish state
export async function updateModuleItem(id, data) {
  const res = await fetch(`${API_BASE}/CourseModuleItem/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// PUT /api/CourseModuleItem/{id}/content – save NovelEditor page content for a document item
export async function updateModuleItemContent(id, content) {
  const res = await fetch(`${API_BASE}/CourseModuleItem/${encodeURIComponent(id)}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return handleResponse(res);
}

// DELETE /api/CourseModuleItem/{id} – remove an item
export async function deleteModuleItem(id) {
  const res = await fetch(`${API_BASE}/CourseModuleItem/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

// ─── Unified page content (used by CourseItemView) ───────────────────────────

/**
 * Load the NovelEditor page content for any ID that may be either a module section
 * or a module item.  Returns { data: parsedContent, pageType: 'item'|'module' }.
 */
export async function getPageContent(pageId) {
  // Try module item first
  try {
    const res = await fetch(`${API_BASE}/CourseModuleItem/${encodeURIComponent(pageId)}`);
    if (res.ok) {
      const item = await res.json();
      const parsed = item.content ? JSON.parse(item.content) : null;
      return {
        pageType: "item",
        title: parsed?.title ?? item.label ?? "Untitled",
        sections: parsed?.sections ?? null,
        raw: item,
      };
    }
  } catch {
    // fall through
  }

  // Fall back to module section
  try {
    const res = await fetch(`${API_BASE}/CourseModule/${encodeURIComponent(pageId)}`);
    if (res.ok) {
      const mod = await res.json();
      const parsed = mod.content ? JSON.parse(mod.content) : null;
      return {
        pageType: "module",
        title: parsed?.title ?? mod.title ?? "Untitled",
        sections: parsed?.sections ?? null,
        raw: mod,
      };
    }
  } catch {
    // fall through
  }

  return { pageType: null, title: "New Page", sections: null, raw: null };
}

/**
 * Persist the NovelEditor page content for a page ID.
 * pageType must be 'item' or 'module'.
 */
export async function savePageContent(pageId, pageType, contentPayload) {
  const content = JSON.stringify(contentPayload);
  if (pageType === "item") {
    return updateModuleItemContent(pageId, content);
  }
  return updateModuleContent(pageId, content);
}

// Link and attachment items keep their URL in `content`. Opens it in a new tab and
// returns false when the item has no address yet, so the caller can explain why.
export function openModuleItemUrl(item) {
  const url = item?.content?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
