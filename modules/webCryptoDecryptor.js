/**
 * modules/webCryptoDecryptor.js
 * Versión Streaming + Progreso Real
 */

export async function descifrarArchivo(url, filename, password, onProgress) {
    try {
        // 1. Descarga con Reporte de Progreso
        const urlSinCache = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        
        const response = await fetch(urlSinCache, { cache: "no-store" });
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        // Obtener tamaño total para la barra de progreso
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body.getReader();
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;

            // Reportar progreso si existe la función callback
            if (onProgress && total > 0) {
                const percent = Math.round((loaded / total) * 100);
                onProgress(percent);
            }
        }

        // Reconstruir el buffer completo
        const fileBuffer = new Uint8Array(loaded);
        let position = 0;
        for (let chunk of chunks) {
            fileBuffer.set(chunk, position);
            position += chunk.length;
        }

        const dataView = new Uint8Array(fileBuffer.buffer);

        // --- CONSTANTES ---
        const MAGIC_BYTES = [0x57, 0x43, 0x30, 0x31]; // WC01
        const MAGIC_LEN = 4;
        const SALT_LEN = 16;
        const IV_LEN = 12;
        const ITERATIONS = 150000;

        // 2. VALIDACIONES
        const headerString = String.fromCharCode(...dataView.slice(0, 5));
        if (headerString.includes("<!DOC") || headerString.includes("<htm")) {
            throw new Error("ERROR_404: El archivo no existe.");
        }

        if (fileBuffer.byteLength < MAGIC_LEN + SALT_LEN + IV_LEN) {
            throw new Error("Archivo corrupto: Tamaño insuficiente.");
        }

        for (let i = 0; i < MAGIC_LEN; i++) {
            if (dataView[i] !== MAGIC_BYTES[i]) throw new Error("Formato inválido: Falta firma WC01.");
        }

        // 3. EXTRAER PARTES
        let offset = MAGIC_LEN;
        const salt = fileBuffer.slice(offset, offset + SALT_LEN); offset += SALT_LEN;
        const iv = fileBuffer.slice(offset, offset + IV_LEN); offset += IV_LEN;
        const ciphertext = fileBuffer.slice(offset);

        // 4. DERIVAR CLAVE
        if (onProgress) onProgress(100, "Descifrando..."); // Estado final

        const textEncoder = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            "raw", textEncoder.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
        );

        const aesKey = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: salt, iterations: ITERATIONS, hash: "SHA-256" },
            passwordKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
        );

        // 5. DESCIFRAR
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv }, aesKey, ciphertext
        );

        // 6. RETORNAR BLOB (No descargar aún)
        return new Blob([decryptedContent], { type: "application/octet-stream" });

    } catch (error) {
        if (error.name === "OperationError") return false; // Contraseña mal
        throw error;
    }
}
