/**
 * modules/hatDecryptor.js
 * Sistema de descifrado robusto v3.0 (Plan estricto)
 * - Carga local (ES Module)
 * - Sin CDN, sin inyección dinámica
 * - Singleton Pattern para evitar race conditions
 * - Límites de memoria ajustados para móviles
 */

// 1. IMPORTACIÓN ESTÁTICA (ES MODULE LOCAL)
import sodium from './vendor/libsodium-wrappers.js';

// 2. SINGLETON PATTERN (Inicialización única)
let sodiumReadyPromise = null;
let sod = null; // Instancia cacheada

/**
 * Inicializa Libsodium una sola vez de forma segura.
 */
async function initCrypto() {
    // Si ya está listo, retornar la instancia existente
    if (sod) return sod;

    // Si se está inicializando, esperar a esa misma promesa (evita carreras)
    if (!sodiumReadyPromise) {
        sodiumReadyPromise = sodium.ready.then(() => {
            sod = sodium;
            return sod;
        }).catch(err => {
            sodiumReadyPromise = null; // Permitir reintento si falla
            throw new Error(`Fallo crítico al iniciar motor WASM: ${err.message}`);
        });
    }

    return await sodiumReadyPromise;
}

export async function descifrarHat(url, filename, password) {
    try {
        // --- VALIDACIÓN DE ENTORNO ---
        if (typeof WebAssembly === "undefined") {
            throw new Error("Tu navegador no soporta WebAssembly (Requerido para descifrar).");
        }

        // 3. INICIALIZACIÓN SEGURA
        const sodiumInstance = await initCrypto();

        // 4. DESCARGA DEL ARCHIVO
        // Usamos fetch con cache: 'no-store' para evitar versiones corruptas del SW
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Error de red al descargar el archivo (${response.status})`);
        
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // --- CONSTANTES ---
        const SALT_LEN = 16;
        const HEADER_LEN = sodiumInstance.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
        const ABYTES = sodiumInstance.crypto_secretstream_xchacha20poly1305_ABYTES;
        const CHUNK_SIZE = 64 * 1024;
        const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + ABYTES;

        if (fileBytes.length < SALT_LEN + HEADER_LEN) {
            throw new Error("El archivo está dañado o incompleto.");
        }

        // 5. EXTRACCIÓN DE CABECERAS
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // 6. DERIVACIÓN DE CLAVE (Ajuste para móviles)
        // ⚠️ ADVERTENCIA: Si cambias esto a 32MB, tus archivos encriptados
        // DEBEN haber sido creados también con 32MB. Si usaste hat.sh oficial (64MB),
        // esto fallará. Si usas tu herramienta admin, actualízala también.
        
        const OPS_LIMIT = 2; 
        const MEM_LIMIT = 67108864; // 64MB
        // const MEM_LIMIT = 67108864; // 64MB (Estándar Hat.sh)

        let key;
        try {
            key = sodiumInstance.crypto_pwhash(
                sodiumInstance.crypto_secretstream_xchacha20poly1305_KEYBYTES,
                password,
                fileSalt,
                OPS_LIMIT,
                MEM_LIMIT,
                sodiumInstance.crypto_pwhash_ALG_ARGON2ID13
            );
        } catch (e) {
            throw new Error("Memoria insuficiente para derivar la clave. Cierra otras pestañas.");
        }

        // 7. INICIALIZACIÓN DEL STREAM
        let state = sodiumInstance.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

        // 8. BUCLE DE DESCIFRADO
        let decryptedParts = [];
        let offset = 0;
        
        while (offset < ciphertext.length) {
            const remaining = ciphertext.length - offset;
            const currentChunkSize = Math.min(remaining, ENCRYPTED_CHUNK_SIZE);
            const chunk = ciphertext.slice(offset, offset + currentChunkSize);
            offset += currentChunkSize;

            const result = sodiumInstance.crypto_secretstream_xchacha20poly1305_pull(state, chunk);
            
            if (!result) {
                // Error específico de contraseña vs corrupción
                throw new Error("CONTRASEÑA_INCORRECTA"); 
            }

            const [decryptedChunk, tag] = result;
            decryptedParts.push(decryptedChunk);

            if (tag === sodiumInstance.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
                break;
            }
        }

        // 9. UNIÓN Y DESCARGA
        // Usamos Blob directamente con el array de partes para ahorrar memoria
        const blob = new Blob(decryptedParts, { type: "application/octet-stream" });
        
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.endsWith(".enc") ? filename.slice(0, -4) : filename; 
        document.body.appendChild(link);
        link.click();
        
        // Limpieza inmediata para liberar RAM
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        }, 100);
        
        return true;

    } catch (error) {
        // Manejo de errores específico
        if (error.message === "CONTRASEÑA_INCORRECTA") {
            console.warn("Intento fallido: Contraseña incorrecta");
            return false; // UI maneja el mensaje
        }
        
        console.error("Error Criptográfico:", error);
        throw error; // UI maneja el error crítico
    }
}
