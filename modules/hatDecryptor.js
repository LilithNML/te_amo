/**
 * modules/hatDecryptor.js
 * Descifrador compatible con hat.sh v2 (XChaCha20-Poly1305 + Argon2id)
 * CORREGIDO: Acceso seguro a window.sodium
 */

export async function descifrarHat(url, filename, password) {
    try {
        // --- CORRECCIÓN AQUÍ ---
        // 1. Verificar si la librería cargó en el navegador
        if (typeof window.sodium === 'undefined') {
            throw new Error("La librería Libsodium no está cargada. Revisa el index.html.");
        }

        // 2. Esperar a que Libsodium esté listo
        await window.sodium.ready;
        const sod = window.sodium; // Usamos la referencia global explícita
        // -----------------------

        // 3. Descargar el archivo cifrado
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error al descargar el archivo .enc");
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // --- CONSTANTES DE HAT.SH ---
        const SALT_LEN = 16;
        // Usamos sod. (que es window.sodium) para acceder a las constantes
        const HEADER_LEN = sod.crypto_secretstream_xchacha20poly1305_HEADERBYTES; 
        const ABYTES = sod.crypto_secretstream_xchacha20poly1305_ABYTES; 
        const CHUNK_SIZE = 64 * 1024; 
        const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + ABYTES;

        if (fileBytes.length < SALT_LEN + HEADER_LEN) {
            throw new Error("El archivo es demasiado pequeño para ser válido.");
        }

        // 4. Extraer Salt y Header
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // 5. Derivar Clave (Argon2id)
        const OPS_LIMIT = 2; 
        const MEM_LIMIT = 67108864;

        const key = sod.crypto_pwhash(
            sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
            password,
            fileSalt,
            OPS_LIMIT,
            MEM_LIMIT,
            sod.crypto_pwhash_ALG_ARGON2ID13
        );

        // 6. Inicializar Stream
        let state = sod.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

        // 7. Bucle de Descifrado por Chunks
        let decryptedParts = [];
        let offset = 0;
        
        while (offset < ciphertext.length) {
            const remaining = ciphertext.length - offset;
            const currentChunkSize = Math.min(remaining, ENCRYPTED_CHUNK_SIZE);
            const chunk = ciphertext.slice(offset, offset + currentChunkSize);
            offset += currentChunkSize;

            const result = sod.crypto_secretstream_xchacha20poly1305_pull(state, chunk);
            
            if (!result) {
                throw new Error("Contraseña incorrecta o fallo de integridad.");
            }

            const [decryptedChunk, tag] = result;
            decryptedParts.push(decryptedChunk);

            if (tag === sod.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
                break; 
            }
        }

        // 8. Unir partes
        let totalLength = 0;
        decryptedParts.forEach(p => totalLength += p.length);
        
        const finalFile = new Uint8Array(totalLength);
        let position = 0;
        decryptedParts.forEach(p => {
            finalFile.set(p, position);
            position += p.length;
        });

        // 9. Generar Descarga
        const blob = new Blob([finalFile], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.endsWith(".enc") ? filename.slice(0, -4) : filename; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;

    } catch (error) {
        console.error("HatDecryptor Error:", error);
        return false;
    }
}
