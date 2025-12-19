/**
 * modules/webCryptoDecryptor.js
 * Descifrado Nativo usando WebCrypto API (Estándar del Navegador).
 */

export async function descifrarArchivo(url, filename, password) {
    try {
        // 1. Descargar el archivo cifrado (.wenc o .enc)
        const response = await fetch(url);
        if (!response.ok) throw new Error("No se pudo descargar el archivo.");
        
        const fileBuffer = await response.arrayBuffer();
        
        // 2. Extraer partes (Salt + IV + Ciphertext)
        // Según herramienta: Salt (16 bytes) | IV (12 bytes) | Contenido...
        const salt = fileBuffer.slice(0, 16);
        const iv = fileBuffer.slice(16, 28);
        const ciphertext = fileBuffer.slice(28);

        // 3. Preparar la clave maestra desde la contraseña
        const textEncoder = new TextEncoder();
        const passwordKey = await window.crypto.subtle.importKey(
            "raw",
            textEncoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // 4. Derivar la clave AES-GCM (Igual que en la herramienta)
        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: new Uint8Array(salt),
                iterations: 100000, // Coincide con la herramienta 
                hash: "SHA-256"
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

        // 6. Generar descarga del archivo limpio
        const blob = new Blob([decryptedContent], { type: "application/octet-stream" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        
        // Limpieza del nombre (quita extensiones extra si las hay)
        let finalName = filename.replace(".enc", "").replace(".wenc", "");
        // Si el archivo original no tenía extensión, intentamos adivinar o dejarlo así
        if (!finalName.includes(".")) finalName = "descifrado_" + filename;

        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        
        // Limpieza de memoria
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
        }, 100);

        return true;

    } catch (error) {
        // WebCrypto lanza 'OperationError' si la contraseña está mal (fallo de autenticación GCM)
        if (error.name === "OperationError") {
            return false; // Contraseña incorrecta
        }
        
        console.error("Error WebCrypto:", error);
        throw new Error("Error técnico: " + error.message);
    }
}
