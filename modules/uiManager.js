/**
 * modules/uiManager.js
 * ------------------------------------------------------------------
 * Gestor de Interfaz de Usuario (UI Manager).
 * * Responsabilidades:
 * - Manipulación del DOM.
 * - Gestión de paneles laterales (Audio, Herramientas).
 * - Modales y Zoom de imágenes (Panzoom).
 * - Efectos visuales (Confeti, Máquina de escribir).
 * - Listados dinámicos y filtros.
 */

import { normalizeText } from './utils.js';
import { herramientasExternas } from './data.js';

export class UIManager {
    constructor() {
        // Cacheo de referencias al DOM para mejorar rendimiento y evitar búsquedas repetitivas
        this.elements = {
            // Área de Juego Principal
            input: document.getElementById("codeInput"),
            contentDiv: document.getElementById("contenido"),
            progressBar: document.querySelector(".progress-bar-fill"),
            progressText: document.getElementById("progreso"),
            toastContainer: document.getElementById("achievement-toast-container"),
            
            // Modal de Imagen (Zoom)
            modal: document.getElementById("imageModal"),
            modalImg: document.getElementById("modalImg"),
            closeModalBtn: document.getElementById("closeModalBtn"),
            
            // Menú y Navegación
            menuButton: document.getElementById("menuButton"),
            dropdownMenu: document.getElementById("dropdownMenu"),
            importInput: document.getElementById("importInput"),
            
            // Paneles Laterales
            audioPanel: document.getElementById("audioPanel"),
            closeAudioPanel: document.getElementById("closeAudioPanel"),
            toolsPanel: document.getElementById("toolsPanel"),
            closeToolsPanel: document.getElementById("closeToolsPanel"),
            toolsListContainer: document.getElementById("toolsListContainer"),
            
            // Sección de Colección (Desbloqueados)
            unlockedSection: document.getElementById("unlockedSection"),
            unlockedList: document.getElementById("unlockedList"),
            searchUnlocked: document.getElementById("searchUnlocked"),
            categoryFilter: document.getElementById("categoryFilter"),
            filterFavBtn: document.getElementById("filterFavBtn"),
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn")
        };

        // Estado interno de la UI
        this.showingFavoritesOnly = false;
        this.panzoomInstance = null;     // Referencia a la instancia de Panzoom
        this.typewriterTimeout = null;   // Referencia al timer de escritura

        // Inicialización de componentes
        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
        this.setupModalListeners();
    }

    /**
     * Cierra el teclado virtual en dispositivos móviles quitando el foco del input.
     */
    dismissKeyboard() {
        if (this.elements.input) {
            this.elements.input.blur();
        }
    }

    /**
     * Inicializa el tema (Oscuro/Claro) según preferencia guardada en LocalStorage.
     */
    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
        }
    }

    /**
     * Alterna el tema y guarda la preferencia.
     */
    toggleDarkMode() {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        this.showToast(isDark ? "Modo Oscuro Activado" : "Modo Claro Activado");
    }

    // =================================================================
    // GESTIÓN DE MENÚS Y PANELES
    // =================================================================

    setupMenuListeners() {
        // Toggle del Menú Hamburguesa
        this.elements.menuButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.elements.dropdownMenu.classList.toggle("show");
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener("click", (e) => {
            if (!this.elements.menuButton.contains(e.target) && 
                !this.elements.dropdownMenu.contains(e.target)) {
                this.elements.dropdownMenu.classList.remove("show");
            }
        });

        // --- Acciones del Menú ---
        
        // Navegación
        this.bindMenuAction("menuHome", () => {
            this.toggleUnlockedPanel(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        this.bindMenuAction("menuShowUnlocked", () => this.toggleUnlockedPanel(true));

        this.bindMenuAction("menuFavorites", () => {
            this.toggleUnlockedPanel(true);
            this.showingFavoritesOnly = true;
            this.updateFilterUI();
            this.triggerListFilter();
        });

        // Herramientas y Ajustes
        this.bindMenuAction("menuDarkMode", () => this.toggleDarkMode());
        
        this.bindMenuAction("menuAudio", () => this.openPanel(this.elements.audioPanel));
        
        this.bindMenuAction("menuTools", () => {
            this.renderTools();
            this.openPanel(this.elements.toolsPanel);
        });

        // Importar / Exportar Datos
        this.bindMenuAction("menuExport", () => this.exportProgress());
        
        this.bindMenuAction("menuImport", () => {
            this.elements.importInput.click(); // Simula clic en el input file oculto
        });

        // Listener para cuando se selecciona un archivo
        this.elements.importInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                this.handleImportFile(e.target.files[0]);
            }
            this.elements.importInput.value = ""; // Resetear para permitir recargar el mismo archivo
        });

        // Botones de cerrar paneles laterales (X)
        if (this.elements.closeAudioPanel) {
            this.elements.closeAudioPanel.addEventListener("click", () => this.closePanel(this.elements.audioPanel));
        }
        if (this.elements.closeToolsPanel) {
            this.elements.closeToolsPanel.addEventListener("click", () => this.closePanel(this.elements.toolsPanel));
        }
    }

    /**
     * Helper para vincular acción a botón del menú y cerrar el menú automáticamente.
     */
    bindMenuAction(id, action) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener("click", () => {
                action();
                this.elements.dropdownMenu.classList.remove("show");
            });
        }
    }

    openPanel(panel) {
        if (panel) {
            panel.classList.add("show");
            panel.setAttribute("aria-hidden", "false");
        }
    }

    closePanel(panel) {
        if (panel) {
            panel.classList.remove("show");
            panel.setAttribute("aria-hidden", "true");
        }
    }

    // =================================================================
    // PANEL DE HERRAMIENTAS
    // =================================================================

    renderTools() {
        const container = this.elements.toolsListContainer;
        if (!container) return;
        container.innerHTML = ""; // Limpiar lista previa

        herramientasExternas.forEach(tool => {
            const card = document.createElement("div");
            card.className = "tool-card";
            card.innerHTML = `
                <div class="tool-header">
                    <i class="${tool.icono}"></i> ${tool.nombre}
                </div>
                <div class="tool-desc">${tool.descripcion}</div>
                <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="tool-btn">
                    Abrir <i class="fas fa-external-link-alt"></i>
                </a>
            `;
            container.appendChild(card);
        });
    }

    // =================================================================
    // MODAL DE IMAGEN Y ZOOM (PANZOOM)
    // =================================================================

    setupModalListeners() {
        // Cerrar con botón X
        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener("click", () => this.closeModal());
        }

        // Cerrar con tecla Escape
        document.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape" && this.elements.modal.style.display === "flex") {
                this.closeModal();
            }
        });

        // Lógica de Doble Tap (para móviles)
        let lastTap = 0;
        this.elements.modalImg.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            // Si el tiempo entre toques es menor a 300ms, es doble tap
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault(); // Prevenir zoom nativo del navegador
                if (this.panzoomInstance) {
                    const currentScale = this.panzoomInstance.getScale();
                    // Alternar entre zoom 2.5x y 1x
                    this.panzoomInstance.zoom(currentScale === 1 ? 2.5 : 1, { animate: true });
                }
            }
            lastTap = currentTime;
        });
    }

    /**
     * Abre el modal e inicializa Panzoom de forma segura.
     * @param {string} src - URL de la imagen.
     */
    openModal(src) {
        // 1. Mostrar el modal (display: flex) para que ocupe espacio
        this.elements.modal.style.display = "flex";
        this.elements.modalImg.src = src;

        // 2. Limpiar instancia previa si existe (CRÍTICO: usar destroy)
        if (this.panzoomInstance) {
            this.panzoomInstance.destroy(); 
            this.panzoomInstance = null;
        }

        // 3. Esperar a que la imagen cargue para calcular dimensiones correctas
        this.elements.modalImg.onload = () => {
            // Inicializar Panzoom
            // @ts-ignore
            this.panzoomInstance = Panzoom(this.elements.modalImg, {
                maxScale: 5,
                minScale: 1,
                contain: 'inside',   // La imagen se ajusta dentro del contenedor sin desbordar
                startScale: 1,       // Escala inicial 100%
                touchAction: 'none', // Permite que JS controle los gestos táctiles
                animate: true
            });

            // Habilitar zoom con rueda del mouse
            // CRÍTICO: { passive: false } evita el warning de violación en consola
            this.elements.modalImg.parentElement.addEventListener(
                'wheel', 
                this.panzoomInstance.zoomWithWheel, 
                { passive: false }
            );
        };
    }

    /**
     * Cierra el modal y limpia la memoria.
     */
    closeModal() {
        this.elements.modal.style.display = "none";
        this.elements.modalImg.src = ""; // Liberar memoria visual

        // Limpiar instancia Panzoom
        if (this.panzoomInstance) {
            this.panzoomInstance.destroy();
            this.panzoomInstance = null;
        }
    }

    // =================================================================
    // EFECTOS ESPECIALES
    // =================================================================

    /**
     * Dispara el efecto de confeti realista.
     */
    triggerConfetti() {
        // Verificar si la librería está cargada
        // @ts-ignore
        if (typeof confetti === 'undefined') return;

        var count = 200;
        var defaults = {
            origin: { y: 0.7 },
            zIndex: 1500
        };

        function fire(particleRatio, opts) {
            // @ts-ignore
            confetti(Object.assign({}, defaults, opts, {
                particleCount: Math.floor(count * particleRatio)
            }));
        }

        // Disparar en ráfagas para efecto natural
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }

    /**
     * Efecto Máquina de Escribir (Typewriter).
     * @param {HTMLElement} element - Elemento donde escribir.
     * @param {string} text - Texto a escribir.
     */
    typeWriterEffect(element, text) {
        // Limpiar timeout anterior si el usuario cambia rápido
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);

        element.innerHTML = ""; // Limpiar contenido
        element.classList.add("typewriter-cursor"); // Añadir cursor CSS

        let i = 0;
        
        // Configuración de velocidad
        const slowSpeed = 70;
        const fastSpeed = 40;
        const accelerationChars = 100;

        const type = () => {
            if (i >= text.length) {
                element.classList.remove("typewriter-cursor"); // Quitar cursor al terminar
                return;
            }

            const char = text.charAt(i);

            // MANEJO SEGURO DEL DOM PARA SALTOS DE LÍNEA
            if (char === '\n') {
                element.appendChild(document.createElement('br'));
            } else {
                element.appendChild(document.createTextNode(char));
            }

            // Velocidad dinámica
            let speed = i < accelerationChars ? slowSpeed : fastSpeed;

            // Pausas naturales en puntuación
            if (char === '.' || char === '!' || char === '?') {
                speed += 300;
            }
            if (char === '\n') {
                speed += 500;
            }

            i++;
            this.typewriterTimeout = setTimeout(type, speed);
        };

        type();
    }

    // =================================================================
    // RENDERIZADO DE CONTENIDO
    // =================================================================

    renderContent(data, key) {
        // Detener máquina de escribir si estaba activa
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);

        const container = this.elements.contentDiv;
        container.hidden = false;
        container.innerHTML = "";

        // Título
        const title = document.createElement("h2");
        title.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        title.style.textTransform = "capitalize";
        container.appendChild(title);

        // Texto descriptivo (usando Typewriter si es "pensamiento")
        if (data.texto && data.type !== 'text') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            container.appendChild(p);
        }

        switch (data.type) {
            case "text":
                const pText = document.createElement("p");
                pText.className = "mensaje-texto";
                
                // Activar efecto si la categoría lo requiere
                if (data.categoria && (data.categoria.toLowerCase() === 'pensamiento' || data.categoria.toLowerCase() === 'carta')) {
                    this.typeWriterEffect(pText, data.texto);
                } else {
                    pText.textContent = data.texto;
                }
                container.appendChild(pText);
                break;

            case "image":
                const img = document.createElement("img");
                img.src = data.imagen;
                img.alt = "Contenido secreto";
                img.style.cursor = "pointer";
                img.onclick = () => this.openModal(data.imagen);
                container.appendChild(img);
                break;

            case "video":
                if (data.videoEmbed) {
                    // Contenedor para Lazy Loading
                    const wrapper = document.createElement("div");
                    wrapper.className = "video-wrapper";

                    // Spinner de carga
                    const loader = document.createElement("div");
                    loader.className = "video-loader";

                    // Iframe
                    const iframe = document.createElement("iframe");
                    iframe.src = data.videoEmbed;
                    iframe.className = "video-frame";
                    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
                    
                    // Evento: Ocultar spinner cuando cargue
                    iframe.onload = () => {
                        loader.style.display = "none";
                        iframe.style.opacity = "1";
                    };

                    wrapper.appendChild(loader);
                    wrapper.appendChild(iframe);
                    container.appendChild(wrapper);
                }
                break;

            case "link":
                const a = document.createElement("a");
                a.href = data.link;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.className = "button";
                a.innerHTML = 'Abrir Enlace <i class="fas fa-external-link-alt"></i>';
                container.appendChild(a);
                break;

            case "download":
                const dl = document.createElement("a");
                dl.href = data.descarga.url;
                dl.download = data.descarga.nombre;
                dl.className = "button";
                dl.innerHTML = `<i class="fas fa-download"></i> Descargar ${data.descarga.nombre}`;
                container.appendChild(dl);
                break;
        }

        // Animación Fade-in
        container.classList.remove("fade-in");
        void container.offsetWidth; // Trigger reflow
        container.classList.add("fade-in");
    }

    renderMessage(titleText, bodyHTML) {
        const c = this.elements.contentDiv;
        c.hidden = false;
        c.innerHTML = `<h2>${titleText}</h2><p>${bodyHTML}</p>`;
        c.classList.remove("fade-in");
        void c.offsetWidth;
        c.classList.add("fade-in");
    }

    // =================================================================
    // UI HELPERS (Utilidades)
    // =================================================================

    showError() {
        this.elements.input.classList.add("shake", "error");
        setTimeout(() => this.elements.input.classList.remove("shake"), 500);
    }

    showSuccess() {
        this.elements.input.classList.remove("error");
        this.elements.input.classList.add("success");
    }

    clearInput() {
        this.elements.input.value = "";
        // No hacemos focus() para evitar abrir teclado en móvil
    }

    updateProgress(unlockedCount, totalCount) {
        const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = `Descubiertos: ${unlockedCount} / ${totalCount}`;
    }

    showToast(message) {
        const toast = document.createElement("div");
        toast.className = "achievement-toast";
        toast.textContent = message;
        this.elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    updateAudioUI(isPlaying, trackName) {
        const btn = document.getElementById("audioPlayPause");
        const txt = document.getElementById("trackName");
        
        if (btn) {
            btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
        if (txt && trackName) {
            txt.textContent = trackName.replace(/_/g, " ").replace(/\.[^/.]+$/, "");
        }
    }

    // =================================================================
    // LISTAS Y FILTROS
    // =================================================================

    setupListListeners() {
        this.elements.searchUnlocked.addEventListener("input", () => this.triggerListFilter());
        this.elements.categoryFilter.addEventListener("change", () => this.triggerListFilter());
        
        this.elements.filterFavBtn.addEventListener("click", () => {
            this.showingFavoritesOnly = !this.showingFavoritesOnly;
            this.updateFilterUI();
            this.triggerListFilter();
        });

        this.elements.closeUnlockedBtn.addEventListener("click", () => this.toggleUnlockedPanel(false));
    }

    toggleUnlockedPanel(show) {
        this.elements.unlockedSection.hidden = !show;
        if (show) {
            this.elements.unlockedSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    updateFilterUI() {
        const btn = this.elements.filterFavBtn;
        if (this.showingFavoritesOnly) {
            btn.classList.add("active");
            btn.innerHTML = '<i class="fas fa-heart"></i> Mostrando Favoritos';
        } else {
            btn.classList.remove("active");
            btn.innerHTML = '<i class="far fa-heart"></i> Solo Favoritos';
        }
    }

    renderUnlockedList(unlockedSet, favoritesSet, mensajesData) {
        this.currentData = { unlockedSet, favoritesSet, mensajesData };

        // Actualizar Select de Categorías
        const categories = new Set();
        unlockedSet.forEach(code => {
            if (mensajesData[code]) categories.add(mensajesData[code].categoria);
        });

        const currentCat = this.elements.categoryFilter.value;
        this.elements.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
        
        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            if (cat === currentCat) opt.selected = true;
            this.elements.categoryFilter.appendChild(opt);
        });

        this.triggerListFilter();
    }

    triggerListFilter() {
        if (!this.currentData) return;
        const { unlockedSet, favoritesSet, mensajesData } = this.currentData;
        const searchTerm = normalizeText(this.elements.searchUnlocked.value);
        const catFilter = this.elements.categoryFilter.value;

        this.elements.unlockedList.innerHTML = "";
        
        const sortedCodes = Array.from(unlockedSet).sort();
        let visibleCount = 0;

        sortedCodes.forEach(code => {
            const data = mensajesData[code];
            if (!data) return;

            // Filtros
            if (this.showingFavoritesOnly && !favoritesSet.has(code)) return;
            if (searchTerm && !normalizeText(code).includes(searchTerm)) return;
            if (catFilter && data.categoria !== catFilter) return;

            visibleCount++;

            const li = document.createElement("li");
            li.className = "lista-codigo-item";
            li.innerHTML = `
                <div style="flex-grow:1">
                    <span class="codigo-text">${code}</span>
                    <span class="category">${data.categoria}</span>
                </div>
            `;

            // Botón Favorito
            const favBtn = document.createElement("button");
            favBtn.className = `favorite-toggle-btn ${favoritesSet.has(code) ? 'active' : ''}`;
            favBtn.innerHTML = `<i class="${favoritesSet.has(code) ? 'fas' : 'far'} fa-heart"></i>`;
            
            favBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.onToggleFavorite) this.onToggleFavorite(code);
            };

            // Abrir contenido al hacer clic
            li.onclick = () => {
                if (this.onCodeSelected) this.onCodeSelected(code);
                this.elements.contentDiv.scrollIntoView({ behavior: 'smooth' });
            };

            li.appendChild(favBtn);
            this.elements.unlockedList.appendChild(li);
        });

        if (visibleCount === 0) {
            this.elements.unlockedList.innerHTML = '<p style="text-align:center; width:100%; opacity:0.7">Sin resultados.</p>';
        }
    }

    // =================================================================
    // IMPORTAR / EXPORTAR
    // =================================================================

    exportProgress() {
        const data = {
            unlocked: JSON.parse(localStorage.getItem("desbloqueados") || "[]"),
            favorites: JSON.parse(localStorage.getItem("favoritos") || "[]"),
            achievements: JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"),
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `progreso_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("Progreso exportado correctamente");
    }

    handleImportFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (this.onImportData) this.onImportData(data);
            } catch (err) {
                this.showToast("Error: Archivo inválido");
            }
        };
        reader.readAsText(file);
    }
}
