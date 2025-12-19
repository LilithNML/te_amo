/**
 * modules/hatDecryptor.js
 * Descifrador Hat.sh - Smart Cloud Loader
 * - Carga desde CDN (Unpkg) para evitar archivos locales corruptos.
 * - Detecta automáticamente la estructura del módulo para evitar errores.
 */

// Enlace al módulo ES oficial (Este archivo SÍ existe)
const LIBSODIUM_URL = "https://unpkg.com/libsodium-wrappers@0.7.15/dist/modules/libsodium-wrappers.js";

let sodiumInstance = null;

/**
 * Función auxiliar para encontrar la librería dentro del módulo importado.
 * Algunos navegadores lo entregan en .default, otros en la raíz, otros como exports nombrados.
 */
function detectSodium(module) {
    // Caso 1: Exportación por defecto (Estándar ES)
    if (module.default && module.default.ready) return module.default;
    
    // Caso 2: El módulo es la librería misma (CommonJS interop)
    if (module.ready) return module;
    
    // Caso 3: Exportación nombrada 'sodium'
    if (module.sodium && module.sodium.ready) return module.sodium;

    // Caso 4: Buscar cualquier propiedad que parezca la librería
    for (const key in module) {
        if (module[key] && module[key].ready) return module[key];
    }
    
    return null;
}

/**
 * Carga la librería desde la nube.
 */
async function loadSodium() {
    if (sodiumInstance) return sodiumInstance;

    console.log("☁️ Conectando con Libsodium Cloud...");

    try {
        // 1. Importación Dinámica (Native Import)
        // Usamos 'await import' que funciona en todos los navegadores modernos
        const module = await import(LIBSODIUM_URL);

        // 2. Detección Inteligente
        const sod = detectSodium(module);

        if (!sod) {
            console.error("Contenido del módulo:", module);
            throw new Error("El módulo cargó, pero no se encontró la exportación 'sodium'.");
        }

        // 3. Inicialización WASM
        // El JS buscará libsodium.wasm en su misma carpeta de origen (unpkg.com)
        await sod.ready;
        
        sodiumInstance = sod;
        console.log("✅ Motor Criptográfico Listo.");
        return sodiumInstance;

    } catch (err) {
        console.error("Fallo de carga:", err);
        throw new Error("No se pudo cargar el motor de cifrado. Verifica tu conexión a Internet.");
    }
}

export async function descifrarHat(url, filename, password) {
    try {
        // PASO 1: Cargar Motor
        const sod = await loadSodium();

        // PASO 2: Descargar Archivo .enc
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Error al descargar el archivo cifrado.");
        
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // PASO 3: Validaciones
        const SALT_LEN = 16;
        const HEADER_LEN = sod.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
        if (fileBytes.length < SALT_LEN + HEADER_LEN) throw new Error("Archivo inválido.");

        // PASO 4: Separar partes
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // PASO 5: Derivar Clave (Argon2id) - Adaptativo
        let key;
        const OPS = 2;
        try {
            // Intento PC (64MB)
            key = sod.crypto_pwhash(
                sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
                password, fileSalt, OPS, 67108864, sod.crypto_pwhash_ALG_ARGON2ID13
            );
        } catch (e) {
            console.warn("⚠️ Memoria baja detectada. Usando modo ligero (32MB).");
            try {
                // Intento Móvil (32MB)
                key = sod.crypto_pwhash(
                    sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
                    password, fileSalt, OPS, 33554432, sod.crypto_pwhash_ALG_ARGON2ID13
                );
            } catch (e2) {
                throw new Error("Tu dispositivo no tiene suficiente memoria RAM para esta operación.");
            }
        }

        // PASO 6: Descifrar
        let state = sod.crypto_secretstream_xchacha20poly1305_init_pull(header, key);
        let decryptedParts = [];
        let offset = 0;
        const CHUNK_SIZE = 64 * 1024;
        const ENC_CHUNK_SIZE = CHUNK_SIZE + sod.crypto_secretstream_xchacha20poly1305_ABYTES;

        while (offset < ciphertext.length) {
            const remaining = ciphertext.length - offset;
            const size = Math.min(remaining, ENC_CHUNK_SIZE);
            const chunk = ciphertext.slice(offset, offset + size);
            offset += size;

            const res = sod.crypto_secretstream_xchacha20poly1305_pull(state, chunk);
            if (!res) return false; // Contraseña mal

            decryptedParts.push(res[0]);
            if (res[1] === sod.crypto_secretstream_xchacha20poly1305_TAG_FINAL) break;
        }

        // PASO 7: Descargar
        const blob = new Blob(decryptedParts, { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.replace(".enc", "");
        document.body.appendChild(link);
        link.click();
        setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(link.href); }, 1000);

        return true;

    } catch (error) {
        console.error("Decrypt Error:", error);
        if (error.message !== "CONTRASEÑA_INCORRECTA") alert(error.message);
        // Si es contraseña incorrecta devolvemos false para que la UI lo maneje, si es otro error lanzamos.
        if (error.message === "CONTRASEÑA_INCORRECTA") return false;
        throw error;
    }
}
