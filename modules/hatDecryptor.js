/**
 * modules/hatDecryptor.js
 * Sistema de descifrado robusto v3.1 (Fix de Importación)
 * - Corrige el error "does not provide an export named default"
 * - Mantiene la carga local segura
 */

// 1. IMPORTACIÓN COMPATIBLE (CAMBIO CRÍTICO)
// Importamos "todo" (*) porque algunas versiones no tienen export default
import * as sodiumLib from './vendor/libsodium-wrappers.js';

// Detectamos si la librería está en .default o en la raíz del objeto
const sodium = sodiumLib.default ? sodiumLib.default : sodiumLib;

// 2. SINGLETON PATTERN
let sodiumReadyPromise = null;
let sod = null; 

/**
 * Inicializa Libsodium una sola vez de forma segura.
 */
async function initCrypto() {
    if (sod) return sod;

    if (!sodiumReadyPromise) {
        // sodium.ready es una promesa que resuelve cuando el WASM cargó
        sodiumReadyPromise = sodium.ready.then(() => {
            sod = sodium;
            return sod;
        }).catch(err => {
            sodiumReadyPromise = null; 
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

        // 3. INICIALIZACIÓN
        const sodiumInstance = await initCrypto();

        // 4. DESCARGA
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

        // 5. EXTRACCIÓN
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // 6. DERIVACIÓN DE CLAVE (32MB para compatibilidad móvil)
        const OPS_LIMIT = 2; 
        const MEM_LIMIT = 33554432; // 32MB

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
            throw new Error("Error de memoria en derivación de clave. Intenta cerrar otras pestañas.");
        }

        // 7. INICIALIZACIÓN STREAM
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
                throw new Error("CONTRASEÑA_INCORRECTA"); 
            }

            const [decryptedChunk, tag] = result;
            decryptedParts.push(decryptedChunk);

            if (tag === sodiumInstance.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
                break;
            }
        }

        // 9. UNIÓN Y DESCARGA
        const blob = new Blob(decryptedParts, { type: "application/octet-stream" });
        
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.endsWith(".enc") ? filename.slice(0, -4) : filename; 
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        }, 100);
        
        return true;

    } catch (error) {
        if (error.message === "CONTRASEÑA_INCORRECTA") {
            console.warn("Intento fallido: Contraseña incorrecta");
            return false;
        }
        console.error("Error Criptográfico:", error);
        throw error;
    }
    }
