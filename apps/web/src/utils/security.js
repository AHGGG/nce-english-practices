
/**
 * Escapes unsafe characters in a string to prevent XSS.
 * @param {string} unsafe - The string to escape.
 * @returns {string} The escaped string.
 */
export const escapeHtml = (unsafe) => {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
