/**
 * modules/utils.js
 * Utilidades puras y funciones criptográficas.
 */

// Normaliza texto: minúsculas, sin acentos, sin espacios extra
export function normalizeText(text) {
    if (!text) return "";
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quitar tildes
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]/g, "") // Solo alfanumérico estricto
        .trim();
}

// Genera un Hash SHA-256 del texto (Devuelve una promesa)
// Esto oculta los códigos reales en la consola del navegador
export async function hashString(message) {
    const msgBuffer = new TextEncoder().encode(normalizeText(message));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Distancia de Levenshtein (para pistas de "estás cerca")
export function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}
