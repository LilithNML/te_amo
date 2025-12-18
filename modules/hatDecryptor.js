/**
 * modules/hatDecryptor.js
 * Descifrador compatible con hat.sh v2 (XChaCha20-Poly1305 + Argon2id)
 * Soporta archivos segmentados (Chunks) y streaming.
 */

export async function descifrarHat(url, filename, password) {
    try {
        // 1. Inicializar Libsodium
        // @ts-ignore
        await sodium.ready;
        // @ts-ignore
        const sod = sodium;

        // 2. Descargar el archivo cifrado
        const response = await fetch(url);
        if (!response.ok) throw new Error("Error al descargar el archivo .enc");
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // --- CONSTANTES DE HAT.SH ---
        const SALT_LEN = 16;
        const HEADER_LEN = sod.crypto_secretstream_xchacha20poly1305_HEADERBYTES; // 24 bytes
        const ABYTES = sod.crypto_secretstream_xchacha20poly1305_ABYTES; // 17 bytes (tag overhead)
        const CHUNK_SIZE = 64 * 1024; // 64KB (Tamaño del bloque original)
        const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + ABYTES; // 65553 bytes

        // Validar tamaño mínimo
        if (fileBytes.length < SALT_LEN + HEADER_LEN) {
            throw new Error("El archivo es demasiado pequeño para ser válido.");
        }

        // 3. Extraer Salt y Header
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        let ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // 4. Derivar Clave (Argon2id)
        // Usamos los valores numéricos exactos de hat.sh para evitar discrepancias de versión
        // OPSLIMIT_INTERACTIVE suele ser 2
        // MEMLIMIT_INTERACTIVE suele ser 67108864 (64MB)
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

        // 5. Inicializar Stream de Descifrado
        let state = sod.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

        // 6. Bucle de Descifrado por Chunks
        // Hat.sh divide el archivo en bloques. Debemos descifrar bloque a bloque.
        let decryptedParts = [];
        let offset = 0;
        
        while (offset < ciphertext.length) {
            // Calcular el tamaño del siguiente chunk (puede ser menor al final)
            const remaining = ciphertext.length - offset;
            const currentChunkSize = Math.min(remaining, ENCRYPTED_CHUNK_SIZE);
            
            const chunk = ciphertext.slice(offset, offset + currentChunkSize);
            offset += currentChunkSize;

            // Descifrar el chunk actual
            const result = sod.crypto_secretstream_xchacha20poly1305_pull(state, chunk);
            
            if (!result) {
                // Si falla aquí, la contraseña es incorrecta o el archivo está corrupto
                throw new Error("Contraseña incorrecta o fallo de integridad.");
            }

            const [decryptedChunk, tag] = result;
            decryptedParts.push(decryptedChunk);

            // Verificar si es el final del stream según la etiqueta
            if (tag === sod.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
                break; 
            }
        }

        // 7. Unir todas las partes descifradas
        // Calcular tamaño total
        let totalLength = 0;
        decryptedParts.forEach(p => totalLength += p.length);
        
        const finalFile = new Uint8Array(totalLength);
        let position = 0;
        decryptedParts.forEach(p => {
            finalFile.set(p, position);
            position += p.length;
        });

        // 8. Generar Descarga
        const blob = new Blob([finalFile], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        // Limpiar extensión .enc si existe
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
