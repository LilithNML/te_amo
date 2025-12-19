/**
 * modules/webCryptoDecryptor.js
 * Descifrador Nativo WebCrypto - CORREGIDO (Soporte Magic Bytes WC01)
 * ------------------------------------------------------------------
 * Sincronizado con 'index-webcrypto.html':
 * - Estructura: [Magic(4)] + [Salt(16)] + [IV(12)] + [Ciphertext]
 * - Iteraciones: 150,000
 */

export async function descifrarArchivo(url, filename, password) {
    try {
        // 1. Descarga Anti-Caché
        const urlSinCache = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        
        const response = await fetch(urlSinCache, { cache: "no-store" });
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        const fileBuffer = await response.arrayBuffer();
        const dataView = new Uint8Array(fileBuffer);

        // --- CONSTANTES DE TU HERRAMIENTA ---
        const MAGIC_BYTES = [0x57, 0x43, 0x30, 0x31]; // "WC01"
        const MAGIC_LEN = 4;
        const SALT_LEN = 16;
        const IV_LEN = 12;
        const ITERATIONS = 150000; // Vital que coincida

        // 2. VALIDACIONES DE INTEGRIDAD
        
        // A) Validar si es un error HTML (404 disfrazado)
        const headerString = String.fromCharCode(...dataView.slice(0, 5));
        if (headerString.includes("<!DOC") || headerString.includes("<htm")) {
            throw new Error("ERROR_404: El archivo no existe en la carpeta assets.");
        }

        // B) Validar tamaño mínimo
        if (fileBuffer.byteLength < MAGIC_LEN + SALT_LEN + IV_LEN) {
            throw new Error("Archivo corrupto: Tamaño insuficiente.");
        }

        // C) Validar Magic Bytes (WC01)
        // Esto confirma si el archivo fue creado con tu herramienta o no
        for (let i = 0; i < MAGIC_LEN; i++) {
            if (dataView[i] !== MAGIC_BYTES[i]) {
                // Si no coincide, puede que sea un archivo viejo sin firma.
                // Lanzamos error para no intentar descifrar basura.
                console.warn(`Byte ${i} esperado ${MAGIC_BYTES[i]} pero es ${dataView[i]}`);
                throw new Error("Formato inválido: Falta la firma 'WC01'. Vuelve a cifrar el archivo.");
            }
        }

        // 3. EXTRAER PARTES (Con el offset correcto)
        let offset = MAGIC_LEN; // Empezamos DESPUÉS de "WC01"

        const salt = fileBuffer.slice(offset, offset + SALT_LEN);
        offset += SALT_LEN;

        const iv = fileBuffer.slice(offset, offset + IV_LEN);
        offset += IV_LEN;

        const ciphertext = fileBuffer.slice(offset);

        // 4. IMPORTAR CLAVE (PBKDF2)
        const textEncoder = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            textEncoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // 5. DERIVAR CLAVE AES
        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: new Uint8Array(salt),
                iterations: ITERATIONS, 
                hash: "SHA-256"
            },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        // 6. DESCIFRAR
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            aesKey,
            ciphertext
        );

        // 7. DESCARGAR
        const blob = new Blob([decryptedContent], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        
        // Limpiar extensión
        let finalName = filename.replace(/\.(wenc|enc)$/i, "");
        if (!finalName.includes(".")) finalName = "descifrado_" + filename;

        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        }, 100);

        return true;

    } catch (error) {
        // OperationError = Contraseña incorrecta (o Salt incorrecta)
        if (error.name === "OperationError") {
            return false; 
        }
        throw error;
    }
}
