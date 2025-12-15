/**
 * modules/uiManager.js
 * Maneja toda la manipulación del DOM de forma segura.
 */
export class UIManager {
    constructor() {
        this.elements = {
            input: document.getElementById("codeInput"),
            contentDiv: document.getElementById("contenido"),
            progressBar: document.querySelector(".progress-bar-fill"),
            progressText: document.getElementById("progreso"),
            toastContainer: document.getElementById("achievement-toast-container"),
            modal: document.getElementById("imageModal"),
            modalImg: document.getElementById("modalImg"),
            modalCaption: document.getElementById("modalCaption")
        };
    }

    // Muestra error visual (Shake)
    showError() {
        this.elements.input.classList.add("shake");
        this.elements.input.classList.add("error");
        setTimeout(() => {
            this.elements.input.classList.remove("shake");
        }, 500);
    }

    showSuccess() {
        this.elements.input.classList.remove("error");
        this.elements.input.classList.add("success");
    }

    clearInput() {
        this.elements.input.value = "";
        this.elements.input.focus();
    }

    updateProgress(unlockedCount, totalCount) {
        const percent = Math.round((unlockedCount / totalCount) * 100);
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = `Descubiertos: ${unlockedCount} / ${totalCount}`;
    }

    showToast(message) {
        const toast = document.createElement("div");
        toast.className = "achievement-toast";
        toast.textContent = message;
        this.elements.toastContainer.appendChild(toast);
        // Eliminar después de la animación
        setTimeout(() => toast.remove(), 4000);
    }

    // RENDERIZADO SEGURO (Sin innerHTML arbitrario)
    renderContent(data) {
        const container = this.elements.contentDiv;
        container.hidden = false;
        container.innerHTML = ""; // Limpiar contenedor anterior

        // Título genérico o específico
        const title = document.createElement("h2");
        title.textContent = "¡Código Correcto!";
        container.appendChild(title);

        // Texto descriptivo (si existe)
        if (data.texto && data.type !== 'text') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            container.appendChild(p);
        }

        // Switch para crear elementos según tipo
        switch (data.type) {
            case "text":
                const pText = document.createElement("p");
                pText.className = "mensaje-texto";
                pText.textContent = data.texto;
                container.appendChild(pText);
                break;

            case "image":
                const img = document.createElement("img");
                img.src = data.imagen;
                img.alt = data.texto || "Imagen desbloqueada";
                img.style.cursor = "pointer";
                img.onclick = () => this.openModal(data.imagen, data.texto);
                container.appendChild(img);
                break;

            case "video":
                if (data.videoEmbed) {
                    const iframe = document.createElement("iframe");
                    iframe.src = data.videoEmbed;
                    iframe.setAttribute("frameborder", "0");
                    iframe.setAttribute("allowfullscreen", "true");
                    iframe.className = "video-frame";
                    container.appendChild(iframe);
                }
                break;

            case "link":
                const a = document.createElement("a");
                a.href = data.link;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.className = "button";
                a.textContent = "Abrir Enlace";
                container.appendChild(a);
                break;
                
            case "download":
                const btnDl = document.createElement("a");
                btnDl.href = data.descarga.url;
                btnDl.download = data.descarga.nombre;
                btnDl.className = "button";
                btnDl.innerHTML = `<i class="fas fa-download"></i> Descargar ${data.descarga.nombre}`;
                container.appendChild(btnDl);
                break;
        }
        
        // Animación de entrada
        container.classList.remove("fade-in");
        void container.offsetWidth; // Trigger reflow
        container.classList.add("fade-in");
    }

    openModal(src, caption) {
        this.elements.modalImg.src = src;
        this.elements.modalCaption.textContent = caption || "";
        this.elements.modal.style.display = "flex";
    }
}
