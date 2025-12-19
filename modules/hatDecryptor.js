/**
 * modules/hatDecryptor.js
 * Descifrador Hat.sh - Versión CDN Estándar (Rutas Corregidas)
 * * - Usa libsodium-wrappers (Estándar) en lugar de SUMO.
 * - Las rutas en UNPKG/JSDELIVR están garantizadas.
 * - Carga automática sin archivos locales.
 */

// RUTAS OFICIALES VERIFICADAS (Versión 0.7.15 Estándar)
// Esta versión SÍ tiene los archivos en /dist/modules/
const LIBSODIUM_CDN = "https://unpkg.com/libsodium-wrappers@0.7.15/dist/modules/libsodium-wrappers.js";

let sodium = null;

/**
 * Carga Libsodium desde la nube automáticamente.
 */
async function loadSodium() {
    if (sodium) return sodium;

    return new Promise((resolve, reject) => {
        // 1. Si ya está cargado en window, usarlo
        if (window.sodium) {
            window.sodium.ready.then(() => {
                sodium = window.sodium;
                resolve(sodium);
            });
            return;
        }

        console.log("Cargando Libsodium desde CDN...");
        
        // 2. Inyectar el script del CDN
        const script = document.createElement("script");
        script.src = LIBSODIUM_CDN;
        script.crossOrigin = "anonymous"; // Importante para evitar errores de CORS
        
        script.onload = async () => {
            try {
                // Al cargar el JS, este buscará automáticamente el .wasm en unpkg.com
                await window.sodium.ready;
                sodium = window.sodium;
                console.log("Libsodium cargado y listo.");
                resolve(sodium);
            } catch (err) {
                reject(new Error("Libsodium cargó el JS pero falló al iniciar WASM: " + err.message));
            }
        };

        script.onerror = () => {
            reject(new Error("No se pudo conectar con el servidor de Libsodium (CDN). Revisa tu internet."));
        };

        document.head.appendChild(script);
    });
}

export async function descifrarHat(url, filename, password) {
    try {
        // --- PASO 1: Cargar el Motor (Desde Internet) ---
        const sod = await loadSodium();

        // --- PASO 2: Descargar el Archivo .enc ---
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Error al descargar el archivo cifrado.");
        
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // --- PASO 3: Constantes de Hat.sh ---
        const SALT_LEN = 16;
        const HEADER_LEN = sod.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
        const ABYTES = sod.crypto_secretstream_xchacha20poly1305_ABYTES;
        const CHUNK_SIZE = 64 * 1024;
        const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + ABYTES;

        if (fileBytes.length < SALT_LEN + HEADER_LEN) {
            throw new Error("El archivo está dañado o es demasiado pequeño.");
        }

        // --- PASO 4: Extraer Partes ---
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // --- PASO 5: Derivar Clave (Argon2id) ---
        // Hat.sh usa 64MB de RAM por defecto.
        // Si falla en el celular, bajamos a 32MB automáticamente.
        let key;
        const OPS_LIMIT = 2;
        const MEM_LIMIT_STANDARD = 67108864; // 64MB
        const MEM_LIMIT_LOW = 33554432;      // 32MB
        
        try {
            key = sod.crypto_pwhash(
                sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
                password,
                fileSalt,
                OPS_LIMIT,
                MEM_LIMIT_STANDARD,
                sod.crypto_pwhash_ALG_ARGON2ID13
            );
        } catch (e) {
            console.warn("Memoria insuficiente (64MB). Reintentando con 32MB...");
            try {
                key = sod.crypto_pwhash(
                    sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
                    password,
                    fileSalt,
                    OPS_LIMIT,
                    MEM_LIMIT_LOW,
                    sod.crypto_pwhash_ALG_ARGON2ID13
                );
            } catch (e2) {
                throw new Error("Tu dispositivo no tiene suficiente memoria para descifrar este archivo.");
            }
        }

        // --- PASO 6: Descifrar (Streaming) ---
        let state = sod.crypto_secretstream_xchacha20poly1305_init_pull(header, key);
        let decryptedParts = [];
        let offset = 0;

        while (offset < ciphertext.length) {
            const remaining = ciphertext.length - offset;
            const currentChunkSize = Math.min(remaining, ENCRYPTED_CHUNK_SIZE);
            const chunk = ciphertext.slice(offset, offset + currentChunkSize);
            offset += currentChunkSize;

            const result = sod.crypto_secretstream_xchacha20poly1305_pull(state, chunk);
            
            if (!result) {
                // Si el descifrado falla, casi siempre es la contraseña
                return false; 
            }

            decryptedParts.push(result[0]); // El mensaje descifrado
            if (result[1] === sod.crypto_secretstream_xchacha20poly1305_TAG_FINAL) break;
        }

        // --- PASO 7: Generar y Descargar ---
        const blob = new Blob(decryptedParts, { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.replace(".enc", ""); // Quitar extensión .enc
        document.body.appendChild(link);
        link.click();
        
        // Limpieza
        setTimeout(() => { 
            document.body.removeChild(link); 
            window.URL.revokeObjectURL(link.href); 
        }, 1000);

        return true;

    } catch (error) {
        console.error("HatDecryptor Error:", error);
        alert("Error: " + error.message);
        throw error;
    }
}
