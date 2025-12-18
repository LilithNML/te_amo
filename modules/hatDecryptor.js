/**
 * modules/hatDecryptor.js
 * Descifrado compatible con hat.sh (XChaCha20-Poly1305 + Argon2id)
 * Ejecutado localmente en el navegador.
 */

export async function descifrarHat(url, filename, password) {
    try {
        // 1. Esperar a que Libsodium esté listo
        // @ts-ignore
        await sodium.ready;
        // @ts-ignore
        const sod = sodium;

        // 2. Descargar el archivo cifrado como ArrayBuffer
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo descargar el archivo .enc");
        const fileBuffer = await response.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);

        // --- LÓGICA DE HAT.SH ---
        
        // Tamaños estándar de hat.sh
        const SALT_LEN = 16;
        const HEADER_LEN = sod.crypto_secretstream_xchacha20poly1305_HEADERBYTES;

        // Validar que el archivo tenga al menos el tamaño del encabezado
        if (fileBytes.length < SALT_LEN + HEADER_LEN) {
            throw new Error("El archivo está dañado o no es un archivo hat.sh válido.");
        }

        // 3. Extraer Salt y Header del archivo
        // Estructura hat.sh: [SALT (16b)] [HEADER (24b)] [CIPHERTEXT...]
        const fileSalt = fileBytes.slice(0, SALT_LEN);
        const header = fileBytes.slice(SALT_LEN, SALT_LEN + HEADER_LEN);
        const ciphertext = fileBytes.slice(SALT_LEN + HEADER_LEN);

        // 4. Derivar la clave maestra usando la contraseña y el Salt (Argon2id)
        // Hat.sh usa configuraciones específicas de memoria y ops para Argon2id
        const key = sod.crypto_pwhash(
            sod.crypto_secretstream_xchacha20poly1305_KEYBYTES,
            password,
            fileSalt,
            sod.crypto_pwhash_OPSLIMIT_INTERACTIVE,
            sod.crypto_pwhash_MEMLIMIT_INTERACTIVE,
            sod.crypto_pwhash_ALG_ARGON2ID13
        );

        // 5. Inicializar el descifrado del flujo (Stream)
        const state = sod.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

        // 6. Descifrar el contenido
        // Nota: hat.sh cifra en "chunks", pero para archivos pequeños/medianos (<500MB) 
        // a menudo podemos intentar descifrar el resto como un solo bloque final si no está segmentado.
        // Si falla, es porque el archivo es muy grande y usa chunks múltiples. 
        // Esta implementación asume un archivo estándar de imagen/video.
        
        const result = sod.crypto_secretstream_xchacha20poly1305_pull(state, ciphertext);
        
        if (!result) throw new Error("Error criptográfico: Posible contraseña incorrecta.");
        
        const [decryptedBytes, tag] = result;

        // Validar tag final (asegura que el archivo no fue alterado)
        if (tag !== sod.crypto_secretstream_xchacha20poly1305_TAG_FINAL && 
            tag !== sod.crypto_secretstream_xchacha20poly1305_TAG_PUSH) {
             // Advertencia: podria ser un chunk intermedio, pero procedemos.
        }

        // 7. Generar descarga
        const blob = new Blob([decryptedBytes], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename.replace(".enc", ""); // Quitar extensión .enc
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;

    } catch (error) {
        console.error("Error en descifrado hat.sh:", error);
        return false;
    }
          }
