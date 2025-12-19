/**
 * modules/webCryptoDecryptor.js
 * Descifrador Nativo WebCrypto - Sincronizado con tu Herramienta
 * Iteraciones: 150,000 | Algoritmo: AES-GCM + PBKDF2
 */

export async function descifrarArchivo(url, filename, password) {
    try {
        // 1. Descarga Anti-Caché
        // Agregamos timestamp para asegurar que no leemos una versión vieja dañada
        const urlSinCache = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        
        const response = await fetch(urlSinCache, { cache: "no-store" });
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        const fileBuffer = await response.arrayBuffer();

        // ⚠️ VALIDACIÓN CRÍTICA:
        // A veces el servidor devuelve una página HTML de error (404) en vez del archivo.
        // Si intentamos descifrar ese HTML, fallará diciendo "Contraseña incorrecta".
        // Verificamos si los primeros bytes parecen texto HTML.
        const firstBytes = new Uint8Array(fileBuffer.slice(0, 5));
        const headerString = String.fromCharCode(...firstBytes);
        if (headerString.includes("<!DOC") || headerString.includes("<htm")) {
            throw new Error("ERROR_404: El archivo no existe en la carpeta assets.");
        }

        // 2. Extraer partes (Tu herramienta usa: Salt 16 bytes | IV 12 bytes | Contenido)
        const salt = fileBuffer.slice(0, 16);
        const iv = fileBuffer.slice(16, 28);
        const ciphertext = fileBuffer.slice(28);

        // 3. Importar contraseña
        const textEncoder = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            textEncoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // 4. Derivar clave AES-GCM
        // ⚠️ DEBE COINCIDIR CON TU HERRAMIENTA
        const ITERATIONS = 150000; // Actualizado a lo que usa tu index-webcrypto.html
        const HASH_ALGO = "SHA-256";

        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: new Uint8Array(salt),
                iterations: ITERATIONS, 
                hash: HASH_ALGO
            },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        // 5. Descifrar
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            aesKey,
            ciphertext
        );

        // 6. Generar Descarga
        const blob = new Blob([decryptedContent], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        
        // Limpiar nombre (.wenc, .enc)
        let finalName = filename.replace(/\.(wenc|enc)$/i, "");
        // Si quedó sin extensión, asumimos original o dejamos así
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
        // Error específico cuando la contraseña está mal (Fallo de integridad GCM)
        if (error.name === "OperationError") {
            return false; 
        }
        // Relanzar otros errores (404, Red, etc)
        throw error;
    }
}
