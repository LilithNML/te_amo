/**
 * modules/uiManager.js
 * ------------------------------------------------------------------
 * Maneja toda la interacción con el DOM, paneles laterales, modales,
 * renderizado de contenido y actualizaciones visuales.
 */

import { normalizeText } from './utils.js';
import { herramientasExternas } from './data.js'; // Importamos la lista de herramientas

export class UIManager {
    constructor() {
        // Cacheo de referencias al DOM para mejorar rendimiento
        this.elements = {
            // Inputs y Áreas principales
            input: document.getElementById("codeInput"),
            contentDiv: document.getElementById("contenido"),
            progressBar: document.querySelector(".progress-bar-fill"),
            progressText: document.getElementById("progreso"),
            toastContainer: document.getElementById("achievement-toast-container"),
            
            // Modal de Imágenes (Zoom)
            modal: document.getElementById("imageModal"),
            modalImg: document.getElementById("modalImg"),
            closeModalBtn: document.getElementById("closeModalBtn"), // Botón X del modal
            
            // Menú Principal
            menuButton: document.getElementById("menuButton"),
            dropdownMenu: document.getElementById("dropdownMenu"),
            importInput: document.getElementById("importInput"),
            
            // Panel de Audio
            audioPanel: document.getElementById("audioPanel"),
            closeAudioPanel: document.getElementById("closeAudioPanel"),
            
            // Panel de Herramientas (NUEVO)
            toolsPanel: document.getElementById("toolsPanel"),
            closeToolsPanel: document.getElementById("closeToolsPanel"),
            toolsListContainer: document.getElementById("toolsListContainer"),
            
            // Sección de Desbloqueados (Listas y Filtros)
            unlockedSection: document.getElementById("unlockedSection"),
            unlockedList: document.getElementById("unlockedList"),
            searchUnlocked: document.getElementById("searchUnlocked"),
            categoryFilter: document.getElementById("categoryFilter"),
            filterFavBtn: document.getElementById("filterFavBtn"),
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn")
        };

        // Estado interno de la UI
        this.showingFavoritesOnly = false;
        this.panzoomInstance = null; // Instancia para controlar el zoom

        // Inicialización
        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
        this.setupModalListeners(); // Lógica de zoom y gestos
    }

    /**
     * Inicializa el tema (Claro/Oscuro) basado en LocalStorage
     */
    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
        }
    }

    /**
     * Alterna entre modo claro y oscuro
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
        // Toggle Menú Hamburguesa
        this.elements.menuButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Evitar cerrar inmediatamente
            this.elements.dropdownMenu.classList.toggle("show");
        });

        // Cerrar menú al hacer clic fuera
        document.addEventListener("click", (e) => {
            if (!this.elements.menuButton.contains(e.target) && 
                !this.elements.dropdownMenu.contains(e.target)) {
                this.elements.dropdownMenu.classList.remove("show");
            }
        });

        // --- Navegación Principal ---
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
        this.bindMenuAction("menuAudio", () => {
            this.elements.audioPanel.classList.add("show");
            this.elements.audioPanel.setAttribute("aria-hidden", "false");
        });

        // Panel de Herramientas (NUEVO)
        this.bindMenuAction("menuTools", () => {
            this.renderTools(); // Generar lista al abrir
            this.elements.toolsPanel.classList.add("show");
            this.elements.toolsPanel.setAttribute("aria-hidden", "false");
        });

        // --- Importar / Exportar ---
        this.bindMenuAction("menuExport", () => this.exportProgress());
        
        this.bindMenuAction("menuImport", () => {
            this.elements.importInput.click(); // Trigger input file oculto
        });

        // Listener para el archivo seleccionado
        this.elements.importInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                this.handleImportFile(e.target.files[0]);
            }
            this.elements.importInput.value = ""; // Resetear input
        });

        // --- Cerrar Paneles Laterales ---
        if (this.elements.closeAudioPanel) {
            this.elements.closeAudioPanel.addEventListener("click", () => {
                this.elements.audioPanel.classList.remove("show");
                this.elements.audioPanel.setAttribute("aria-hidden", "true");
            });
        }

        if (this.elements.closeToolsPanel) {
            this.elements.closeToolsPanel.addEventListener("click", () => {
                this.elements.toolsPanel.classList.remove("show");
                this.elements.toolsPanel.setAttribute("aria-hidden", "true");
            });
        }
    }

    /**
     * Helper para asignar acciones a botones del menú y cerrar el menú automáticamente
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

    // =================================================================
    // PANEL DE HERRAMIENTAS
    // =================================================================

    /**
     * Renderiza la lista de herramientas externas definida en data.js
     */
    renderTools() {
        const container = this.elements.toolsListContainer;
        if (!container) return;

        container.innerHTML = ""; // Limpiar lista anterior

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
    // MODAL DE IMAGEN CON ZOOM (PANZOOM)
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

        // LÓGICA DE DOBLE TAP (Móvil)
        let lastTap = 0;
        this.elements.modalImg.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            // Detectar si fue un tap rápido (<300ms) después del anterior
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault(); // Evitar zoom nativo del navegador
                if (this.panzoomInstance) {
                    const currentScale = this.panzoomInstance.getScale();
                    // Si está en zoom normal -> Zoom In (2.5x). Si ya tiene zoom -> Reset.
                    this.panzoomInstance.zoom(currentScale === 1 ? 2.5 : 1, { animate: true });
                }
            }
            lastTap = currentTime;
        });
    }

    /**
     * Abre el modal e inicializa Panzoom
     * @param {string} src - URL de la imagen
     */
    openModal(src) {
        this.elements.modalImg.src = src;
        this.elements.modal.style.display = "flex";

        // Pequeño timeout para asegurar que el elemento es visible antes de calcular dimensiones
        setTimeout(() => {
            // Limpieza defensiva: Si ya existe una instancia, destruirla primero
            if (this.panzoomInstance) {
                this.panzoomInstance.dispose();
            }

            // Inicializar Panzoom
            // @ts-ignore (Si usaras TypeScript, Panzoom es global)
            this.panzoomInstance = Panzoom(this.elements.modalImg, {
                maxScale: 5,        // Zoom máximo 5x
                minScale: 1,        // No permitir zoom negativo
                contain: 'outside', // La imagen se contiene visualmente
                startScale: 1,
                animate: true       // Animaciones suaves
            });

            // Habilitar zoom con la rueda del mouse (Desktop)
            // Se adjunta al padre para mejor control
            this.elements.modalImg.parentElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);
        }, 50);
    }

    /**
     * Cierra el modal y limpia memoria
     */
    closeModal() {
        this.elements.modal.style.display = "none";
        this.elements.modalImg.src = ""; // Liberar recurso visual

        // Importante: Destruir instancia para evitar memory leaks y resetear posición
        if (this.panzoomInstance) {
            this.panzoomInstance.dispose();
            this.panzoomInstance = null;
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
                // Callback al Engine para procesar los datos
                if (this.onImportData) {
                    this.onImportData(data);
                }
            } catch (err) {
                this.showToast("Error: El archivo no es válido");
            }
        };
        reader.readAsText(file);
    }

    // =================================================================
    // LISTAS Y FILTROS (Desbloqueados)
    // =================================================================

    setupListListeners() {
        // Búsqueda en tiempo real
        this.elements.searchUnlocked.addEventListener("input", () => this.triggerListFilter());
        
        // Filtro por categoría
        this.elements.categoryFilter.addEventListener("change", () => this.triggerListFilter());
        
        // Botón toggle "Solo Favoritos"
        this.elements.filterFavBtn.addEventListener("click", () => {
            this.showingFavoritesOnly = !this.showingFavoritesOnly;
            this.updateFilterUI();
            this.triggerListFilter();
        });

        // Cerrar panel de lista
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

    /**
     * Renderiza la lista completa de códigos desbloqueados
     */
    renderUnlockedList(unlockedSet, favoritesSet, mensajesData) {
        // Guardamos referencia a los datos actuales para usar en el filtrado
        this.currentData = { unlockedSet, favoritesSet, mensajesData };

        // Actualizar Select de Categorías dinámicamente
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

    /**
     * Filtra y dibuja la lista en el DOM
     */
    triggerListFilter() {
        if (!this.currentData) return;
        const { unlockedSet, favoritesSet, mensajesData } = this.currentData;
        
        const searchTerm = normalizeText(this.elements.searchUnlocked.value);
        const catFilter = this.elements.categoryFilter.value;

        this.elements.unlockedList.innerHTML = "";
        
        // Ordenar alfabéticamente
        const sortedCodes = Array.from(unlockedSet).sort();

        let visibleCount = 0;

        sortedCodes.forEach(code => {
            const data = mensajesData[code];
            if (!data) return;

            // Aplicar Filtros
            if (this.showingFavoritesOnly && !favoritesSet.has(code)) return;
            if (searchTerm && !normalizeText(code).includes(searchTerm)) return;
            if (catFilter && data.categoria !== catFilter) return;

            visibleCount++;

            // Crear Elemento LI
            const li = document.createElement("li");
            li.className = "lista-codigo-item";
            li.innerHTML = `
                <div style="flex-grow:1">
                    <span class="codigo-text">${code}</span>
                    <span class="category">${data.categoria}</span>
                </div>
            `;

            // Botón Corazón
            const favBtn = document.createElement("button");
            favBtn.className = `favorite-toggle-btn ${favoritesSet.has(code) ? 'active' : ''}`;
            favBtn.innerHTML = `<i class="${favoritesSet.has(code) ? 'fas' : 'far'} fa-heart"></i>`;
            
            // Evento Favorito (Stop Propagation para no abrir el contenido)
            favBtn.onclick = (e) => {
                e.stopPropagation();
                if (this.onToggleFavorite) this.onToggleFavorite(code);
            };

            // Evento Abrir Contenido
            li.onclick = () => {
                if (this.onCodeSelected) this.onCodeSelected(code);
                // Scroll suave hacia el contenido
                this.elements.contentDiv.scrollIntoView({ behavior: 'smooth' });
            };

            li.appendChild(favBtn);
            this.elements.unlockedList.appendChild(li);
        });

        // Mensaje de vacío
        if (visibleCount === 0) {
            this.elements.unlockedList.innerHTML = '<p style="text-align:center; width:100%; opacity:0.7">No se encontraron resultados.</p>';
        }
    }

    // =================================================================
    // RENDERIZADO DE CONTENIDO (Main Display)
    // =================================================================

    renderContent(data, key) {
        const container = this.elements.contentDiv;
        container.hidden = false;
        container.innerHTML = ""; // Limpiar previo

        // Título del hallazgo
        const title = document.createElement("h2");
        title.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        title.style.textTransform = "capitalize";
        container.appendChild(title);

        // Texto descriptivo (si no es tipo 'text' puro)
        if (data.texto && data.type !== 'text') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            container.appendChild(p);
        }

        // Switch de tipos de contenido
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
                img.alt = data.texto || "Imagen secreta";
                img.style.cursor = "pointer"; // Indicar que es clickeable
                // Abrir modal con zoom al hacer click
                img.onclick = () => this.openModal(data.imagen);
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

        // Reiniciar animación Fade In
        container.classList.remove("fade-in");
        void container.offsetWidth; // Trigger Reflow
        container.classList.add("fade-in");
    }

    renderMessage(titleText, bodyHTML) {
        const container = this.elements.contentDiv;
        container.hidden = false;
        container.innerHTML = `<h2>${titleText}</h2><p>${bodyHTML}</p>`;
        
        container.classList.remove("fade-in");
        void container.offsetWidth;
        container.classList.add("fade-in");
    }

    // =================================================================
    // UI HELPERS (Utilidades visuales)
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
        this.elements.input.focus();
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
        // Eliminar del DOM tras la animación (4s)
        setTimeout(() => toast.remove(), 4000);
    }

    /**
     * Actualiza el panel de audio (Icono play/pause y nombre de pista)
     */
    updateAudioUI(isPlaying, trackName) {
        const btn = document.getElementById("audioPlayPause");
        const txt = document.getElementById("trackName");
        
        if (btn) {
            btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
        if (txt && trackName) {
            // Limpiar nombre de archivo para que se vea bonito
            txt.textContent = trackName.replace(/_/g, " ").replace(/\.[^/.]+$/, "");
        }
    }
}
