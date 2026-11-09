const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5299/api";

// Without a Cloudinary account configured, files go to the Koru API, which saves them under wwwroot/uploads.
// Returns a full URL so images and submissions open the same way Cloudinary links do.
async function apiUpload(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/Submission/upload`, { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return new URL(data.url, API_BASE).href;
}

async function cloudinaryUpload(file, resourceType = "image") {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return apiUpload(file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
        { method: "POST", body: formData }
    );

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Cloudinary upload failed");
    }

    const data = await res.json();
    return data.secure_url;
}

// Images only (existing usage)
export async function uploadImageToCloudinary(file) {
    return cloudinaryUpload(file, "image");
}

// Any file type — routes to the correct Cloudinary resource type
export async function uploadFileToCloudinary(file) {
    const type = file.type || "";
    if (type.startsWith("video/") || type.startsWith("audio/")) {
        return cloudinaryUpload(file, "video");
    }
    // Images and PDFs both work as "image" type — publicly accessible, no auth issues
    if (type.startsWith("image/") || type === "application/pdf") {
        return cloudinaryUpload(file, "image");
    }
    // Other docs/zips → raw
    return cloudinaryUpload(file, "raw");
}
