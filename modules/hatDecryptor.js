/**
 * modules/hatDecryptor.js
 * Descifrador Hat.sh - Versión Importación Directa (ES Module)
 * Soluciona el error "Cannot read properties of undefined (reading 'ready')"
 */

// URL del CDN (Versión Estándar que contiene el módulo correcto)
const LIBSODIUM_CDN = "https://unpkg.com/libsodium-wrappers@0.7.15/dist/modules/libsodium-wrappers.js";

let sodium = null;

/**
 * Carga Libsodium importándolo directamente desde el CDN.
 */
async function loadSodium() {
    if (sodium) return sodium;

    try {
        console.log("Conectando con el módulo criptográfico...");

        // 1. IMPORTACIÓN DINÁMICA
        // En lugar de crear un <script>, importamos directamente la URL.
        const sodiumModule = await import(LIBSODIUM_CDN);

        // 2. Normalizar la exportación
        // Algunos módulos exportan en 'default', otros en la raíz. Detectamos cuál es.
        const sodiumTools = sodiumModule.default || sodiumModule;

        // 3. Esperar a que el WASM arranque
        // El módulo JS buscará automáticamente el .wasm relativo a su URL en el CDN.
        await sodiumTools.ready;
        
        sodium = sodiumTools;
        console.log("Motor criptográfico iniciado correctamente.");
        return sodium;

    } catch (err) {
        console.error("Fallo al importar Libsodium:", err);
        throw new Error("No se pudo cargar la librería de cifrado. Revisa tu conexión a internet.");
    }
}

export async function descifrarHat(url, filename, password) {
    try {
        // --- PASO 1: Cargar el Motor ---
        const sod = await loadSodium();

        // --- PASO 2: Descargar el Archivo .enc ---
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("Error al descargar el archivo cifrado.");
        
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // --- PASO 3: Validar Estructura Hat.sh ---
        const SALT_LEN = 16;
        const HEADER_LEN = sod.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
        const ABYTES = sod.crypto_secretstream_xchacha20poly1305_ABYTES;
        const CHUNK_SIZE = 64 * 1024;
        const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + ABYTES;

        if (fileBytes.length < SALT_LEN + HEADER_LEN) {
            throw new Error("El archivo es demasiado pequeño o inválido.");
        }

        // --- PASO 4: Separar Componentes ---
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // --- PASO 5: Derivar Clave (Argon2id) ---
        // Lógica de memoria adaptativa para móviles
        let key;
        const OPS_LIMIT = 2;
        const MEM_LIMIT_PC = 67108864; // 64MB (Estándar)
        const MEM_LIMIT_MOBILE = 33554432; // 32MB (Fallback)
        
        try {
            key = sod.crypto_pwhash(
                sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
                password,
                fileSalt,
                OPS_LIMIT,
                MEM_LIMIT_PC,
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
                    MEM_LIMIT_MOBILE,
                    sod.crypto_pwhash_ALG_ARGON2ID13
                );
            } catch (e2) {
                throw new Error("Memoria insuficiente en el dispositivo.");
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
            
            if (!result) return false; // Contraseña incorrecta

            decryptedParts.push(result[0]); // [mensaje, tag]
            if (result[1] === sod.crypto_secretstream_xchacha20poly1305_TAG_FINAL) break;
        }

        // --- PASO 7: Generar Descarga ---
        const blob = new Blob(decryptedParts, { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.replace(".enc", "");
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => { 
            document.body.removeChild(link); 
            window.URL.revokeObjectURL(link.href); 
        }, 1000);

        return true;

    } catch (error) {
        console.error("HatDecryptor Error:", error);
        // Filtramos errores técnicos para mostrarlos en alerta si es necesario
        if (error.message !== "CONTRASEÑA_INCORRECTA") {
            alert("Error del Sistema: " + error.message);
        }
        throw error;
    }
}
