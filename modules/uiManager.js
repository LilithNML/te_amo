/**
 * modules/uiManager.js
 * ------------------------------------------------------------------
 * Gestor de Interfaz de Usuario (UI Manager).
 * Se encarga de manipular el DOM, gestionar paneles laterales, modales,
 * renderizar listas, controlar la librería Panzoom y el feedback visual.
 */

import { normalizeText } from './utils.js';
import { herramientasExternas } from './data.js';

export class UIManager {
    constructor() {
        // Cacheo de referencias al DOM para mejorar rendimiento
        this.elements = {
            // Entradas y Salidas principales
            input: document.getElementById("codeInput"),
            contentDiv: document.getElementById("contenido"),
            progressBar: document.querySelector(".progress-bar-fill"),
            progressText: document.getElementById("progreso"),
            toastContainer: document.getElementById("achievement-toast-container"),
            
            // Modal de Imagen (Zoom)
            modal: document.getElementById("imageModal"),
            modalImg: document.getElementById("modalImg"),
            closeModalBtn: document.getElementById("closeModalBtn"),
            
            // Menú Hamburguesa
            menuButton: document.getElementById("menuButton"),
            dropdownMenu: document.getElementById("dropdownMenu"),
            importInput: document.getElementById("importInput"),
            
            // Panel Lateral de Audio
            audioPanel: document.getElementById("audioPanel"),
            closeAudioPanel: document.getElementById("closeAudioPanel"),
            
            // Panel Lateral de Herramientas
            toolsPanel: document.getElementById("toolsPanel"),
            closeToolsPanel: document.getElementById("closeToolsPanel"),
            toolsListContainer: document.getElementById("toolsListContainer"),
            
            // Sección de Códigos Desbloqueados
            unlockedSection: document.getElementById("unlockedSection"),
            unlockedList: document.getElementById("unlockedList"),
            searchUnlocked: document.getElementById("searchUnlocked"),
            categoryFilter: document.getElementById("categoryFilter"),
            filterFavBtn: document.getElementById("filterFavBtn"),
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn")
        };

        // Estado interno
        this.showingFavoritesOnly = false;
        this.panzoomInstance = null; // Instancia de la librería Panzoom

        // Inicialización
        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
        this.setupModalListeners();
    }

    /**
     * Cierra el teclado virtual quitando el foco del input.
     * Esencial para mejorar la UX en móviles tras enviar un formulario.
     */
    dismissKeyboard() {
        if (this.elements.input) {
            this.elements.input.blur();
        }
    }

    /**
     * Inicializa el tema (Oscuro/Claro) según preferencia guardada
     */
    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
        }
    }

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
        // Toggle Menú Hamburguesa
        this.elements.menuButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.elements.dropdownMenu.classList.toggle("show");
        });

        // Cerrar al hacer clic fuera del menú
        document.addEventListener("click", (e) => {
            if (!this.elements.menuButton.contains(e.target) && 
                !this.elements.dropdownMenu.contains(e.target)) {
                this.elements.dropdownMenu.classList.remove("show");
            }
        });

        // --- Acciones de Navegación ---
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

        // --- Herramientas del Sistema ---
        this.bindMenuAction("menuDarkMode", () => this.toggleDarkMode());

        // Panel de Audio
        this.bindMenuAction("menuAudio", () => this.openPanel(this.elements.audioPanel));

        // Panel de Herramientas (Renderizado dinámico)
        this.bindMenuAction("menuTools", () => {
            this.renderTools();
            this.openPanel(this.elements.toolsPanel);
        });

        // --- Gestión de Datos (Importar/Exportar) ---
        this.bindMenuAction("menuExport", () => this.exportProgress());
        
        this.bindMenuAction("menuImport", () => {
            this.elements.importInput.click(); // Disparar input file oculto
        });

        this.elements.importInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                this.handleImportFile(e.target.files[0]);
            }
            this.elements.importInput.value = ""; // Resetear para permitir cargar el mismo archivo
        });

        // Botones de cerrar paneles laterales
        if (this.elements.closeAudioPanel) {
            this.elements.closeAudioPanel.addEventListener("click", () => this.closePanel(this.elements.audioPanel));
        }
        if (this.elements.closeToolsPanel) {
            this.elements.closeToolsPanel.addEventListener("click", () => this.closePanel(this.elements.toolsPanel));
        }
    }

    /**
     * Vincula una acción a un ID de botón del menú y cierra el menú al hacer clic
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

    /**
     * Genera la lista de herramientas basada en data.js
     */
    renderTools() {
        const container = this.elements.toolsListContainer;
        if (!container) return;
        container.innerHTML = "";

        herramientasExternas.forEach(tool => {
            const card = document.createElement("div");
            card.className = "tool-card";
            card.innerHTML = `
                <div class="tool-header"><i class="${tool.icono}"></i> ${tool.nombre}</div>
                <div class="tool-desc">${tool.descripcion}</div>
                <a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="tool-btn">
                    Abrir <i class="fas fa-external-link-alt"></i>
                </a>
            `;
            container.appendChild(card);
        });
    }

    // =================================================================
    // MODAL DE IMAGEN (ZOOM FIX)
    // =================================================================

    setupModalListeners() {
        // Botón Cerrar
        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener("click", () => this.closeModal());
        }

        // Tecla Escape
        document.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape" && this.elements.modal.style.display === "flex") {
                this.closeModal();
            }
        });

        // Lógica de Doble Tap para Zoom
        let lastTap = 0;
        this.elements.modalImg.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            // Detectar si es un doble tap (<300ms)
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault(); // Evitar zoom nativo del navegador
                if (this.panzoomInstance) {
                    const currentScale = this.panzoomInstance.getScale();
                    // Alternar entre Zoom 2.5x y 1x (Reset)
                    this.panzoomInstance.zoom(currentScale === 1 ? 2.5 : 1, { animate: true });
                }
            }
            lastTap = currentTime;
        });
    }

    /**
     * Abre el modal e inicializa Panzoom de forma segura
     */
    openModal(src) {
        // 1. Mostrar contenedor (display flex) primero
        this.elements.modal.style.display = "flex";
        
        // 2. Asignar fuente de la imagen
        this.elements.modalImg.src = src;

        // 3. Limpiar instancia previa si existe (evita conflictos de memoria)
        if (this.panzoomInstance) {
            this.panzoomInstance.dispose();
            this.panzoomInstance = null;
        }

        // 4. FIX: Esperar a que la imagen cargue para calcular dimensiones
        this.elements.modalImg.onload = () => {
            // Inicializar Panzoom
            // @ts-ignore
            this.panzoomInstance = Panzoom(this.elements.modalImg, {
                maxScale: 5,        // Zoom máximo 5x
                minScale: 1,        // No permitir reducir más del original
                contain: 'inside',  // IMPORTANTE: La imagen se ajusta dentro, sin zoom invasivo inicial
                startScale: 1,      // Empieza al 100% del tamaño ajustado
                touchAction: 'none', // IMPORTANTE: Permite gestos en móviles sin mover la página
                animate: true
            });

            // Habilitar zoom con rueda del mouse
            this.elements.modalImg.parentElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);
        };
    }

    closeModal() {
        this.elements.modal.style.display = "none";
        this.elements.modalImg.src = ""; // Liberar memoria visual

        if (this.panzoomInstance) {
            this.panzoomInstance.dispose(); // Limpieza de listeners
            this.panzoomInstance = null;
        }
    }

    // =================================================================
    // LISTAS Y FILTROS (Desbloqueados)
    // =================================================================

    setupListListeners() {
        // Búsqueda
        this.elements.searchUnlocked.addEventListener("input", () => this.triggerListFilter());
        
        // Categoría
        this.elements.categoryFilter.addEventListener("change", () => this.triggerListFilter());
        
        // Favoritos Toggle
        this.elements.filterFavBtn.addEventListener("click", () => {
            this.showingFavoritesOnly = !this.showingFavoritesOnly;
            this.updateFilterUI();
            this.triggerListFilter();
        });

        // Cerrar panel
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

            // Filtros Lógicos
            if (this.showingFavoritesOnly && !favoritesSet.has(code)) return;
            if (searchTerm && !normalizeText(code).includes(searchTerm)) return;
            if (catFilter && data.categoria !== catFilter) return;

            visibleCount++;

            // Crear Item
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

            // Abrir contenido
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
    // RENDERIZADO DE CONTENIDO (Main)
    // =================================================================

    renderContent(data, key) {
        const container = this.elements.contentDiv;
        container.hidden = false;
        container.innerHTML = "";

        // Título
        const title = document.createElement("h2");
        title.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        title.style.textTransform = "capitalize";
        container.appendChild(title);

        // Texto descriptivo general
        if (data.texto && data.type !== 'text') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            container.appendChild(p);
        }

        // Switch por Tipo de Contenido
        switch (data.type) {
            case "text":
                const pt = document.createElement("p");
                pt.className = "mensaje-texto";
                pt.textContent = data.texto;
                container.appendChild(pt);
                break;

            case "image":
                const img = document.createElement("img");
                img.src = data.imagen;
                img.alt = data.texto || "Imagen";
                img.style.cursor = "pointer";
                img.onclick = () => this.openModal(data.imagen); // Abre el modal con zoom
                container.appendChild(img);
                break;

            case "video":
                if (data.videoEmbed) {
                    const iframe = document.createElement("iframe");
                    iframe.src = data.videoEmbed;
                    iframe.className = "video-frame";
                    iframe.setAttribute("allow", "autoplay; encrypted-media");
                    iframe.setAttribute("allowfullscreen", "true");
                    container.appendChild(iframe);
                }
                break;

            case "link":
                const a = document.createElement("a");
                a.href = data.link;
                a.target = "_blank";
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

        // Reiniciar animación Fade In
        container.classList.remove("fade-in");
        void container.offsetWidth; // Trigger reflow
        container.classList.add("fade-in");
    }

    renderMessage(title, bodyHTML) {
        const c = this.elements.contentDiv;
        c.hidden = false;
        c.innerHTML = `<h2>${title}</h2><p>${bodyHTML}</p>`;
        c.classList.remove("fade-in");
        void c.offsetWidth;
        c.classList.add("fade-in");
    }

    // =================================================================
    // UI HELPERS
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
        // No hacemos focus() para no reabrir teclado en móviles
    }

    updateProgress(u, t) {
        const p = t > 0 ? Math.round((u / t) * 100) : 0;
        this.elements.progressBar.style.width = `${p}%`;
        this.elements.progressText.textContent = `Descubiertos: ${u} / ${t}`;
    }

    showToast(msg) {
        const t = document.createElement("div");
        t.className = "achievement-toast";
        t.textContent = msg;
        this.elements.toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }

    updateAudioUI(isPlaying, trackName) {
        const btn = document.getElementById("audioPlayPause");
        const txt = document.getElementById("trackName");
        if (btn) btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        if (txt && trackName) txt.textContent = trackName.replace(/_/g, " ").replace(/\.[^/.]+$/, "");
    }

    // =================================================================
    // IMPORT / EXPORT
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
