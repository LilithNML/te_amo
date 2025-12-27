/**
 * modules/uiManager.js
 * Versión Final: Con Paginación y CSS Grid fix
 */

import { normalizeText } from './utils.js';
import { herramientasExternas } from './data.js';
import { descifrarArchivo } from './webCryptoDecryptor.js';

export class UIManager {
    constructor() {
        this.elements = {
            input: document.getElementById("codeInput"),
            contentDiv: document.getElementById("contenido"),
            progressBar: document.querySelector(".progress-bar-fill"),
            progressText: document.getElementById("progreso"),
            toastContainer: document.getElementById("achievement-toast-container"),
            menuButton: document.getElementById("menuButton"),
            dropdownMenu: document.getElementById("dropdownMenu"),
            importInput: document.getElementById("importInput"),
            audioPanel: document.getElementById("audioPanel"),
            closeAudioPanel: document.getElementById("closeAudioPanel"),
            toolsPanel: document.getElementById("toolsPanel"),
            closeToolsPanel: document.getElementById("closeToolsPanel"),
            toolsListContainer: document.getElementById("toolsListContainer"),
            unlockedSection: document.getElementById("unlockedSection"),
            unlockedList: document.getElementById("unlockedList"),
            searchUnlocked: document.getElementById("searchUnlocked"),
            categoryFilter: document.getElementById("categoryFilter"),
            filterFavBtn: document.getElementById("filterFavBtn"),
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn"),
            // Elementos de Paginación
            paginationControls: document.getElementById("paginationControls"),
            prevPageBtn: document.getElementById("prevPageBtn"),
            nextPageBtn: document.getElementById("nextPageBtn"),
            pageIndicator: document.getElementById("pageIndicator")
        };

        // Estado de Paginación
        this.currentPage = 1;
        this.itemsPerPage = 10; // Mostrar 10 por página
        this.currentFilteredData = []; // Datos filtrados actuales

        this.onToggleFavorite = null;
        this.onCodeSelected = null;
        this.onImportData = null;

        this.setupInternalEvents();
    }

    setupInternalEvents() {
        // Toggle Menú
        this.elements.menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.elements.dropdownMenu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!this.elements.dropdownMenu.contains(e.target) && e.target !== this.elements.menuButton) {
                this.elements.dropdownMenu.classList.remove('show');
            }
        });

        // Toggle Favoritos Filtro
        this.elements.filterFavBtn.addEventListener('click', () => {
            this.elements.filterFavBtn.classList.toggle('active');
            // Disparar evento de renderizado externo (se maneja en GameEngine o aquí mismo al filtrar)
            this.triggerRenderUpdate();
        });

        // Inputs de búsqueda
        this.elements.searchUnlocked.addEventListener('input', () => { this.currentPage = 1; this.triggerRenderUpdate(); });
        this.elements.categoryFilter.addEventListener('change', () => { this.currentPage = 1; this.triggerRenderUpdate(); });
        
        // Botón cerrar lista
        this.elements.closeUnlockedBtn.addEventListener('click', () => {
            this.elements.unlockedSection.hidden = true;
        });

        // Eventos Paginación
        this.elements.prevPageBtn.addEventListener('click', () => this.changePage(-1));
        this.elements.nextPageBtn.addEventListener('click', () => this.changePage(1));

        // Paneles Laterales
        document.getElementById("menuAudio").addEventListener('click', () => this.togglePanel(this.elements.audioPanel, true));
        this.elements.closeAudioPanel.addEventListener('click', () => this.togglePanel(this.elements.audioPanel, false));
        
        document.getElementById("menuTools").addEventListener('click', () => {
            this.renderTools();
            this.togglePanel(this.elements.toolsPanel, true);
        });
        this.elements.closeToolsPanel.addEventListener('click', () => this.togglePanel(this.elements.toolsPanel, false));
    }

    // Método auxiliar para forzar actualización desde GameEngine
    triggerRenderUpdate() {
        // Este método será llamado indirectamente. 
        // En GameEngine deberías llamar a renderUnlockedList cada vez que cambie un filtro.
        // Pero para simplificar, guardaremos referencias en renderUnlockedList.
        if (this.lastRenderArgs) {
            this.renderUnlockedList(...this.lastRenderArgs);
        }
    }

    // =========================================================
    // LÓGICA DE LISTA Y PAGINACIÓN
    // =========================================================
    renderUnlockedList(unlockedSet, favoritesSet, mensajesDB) {
        // Guardar argumentos para refrescar filtros
        this.lastRenderArgs = [unlockedSet, favoritesSet, mensajesDB];

        const searchText = normalizeText(this.elements.searchUnlocked.value);
        const catFilter = this.elements.categoryFilter.value;
        const onlyFav = this.elements.filterFavBtn.classList.contains('active');

        // 1. Preparar datos
        const allCodes = Object.keys(mensajesDB).sort();
        let results = [];

        // Llenar select de categorías (solo una vez o si está vacío)
        if (this.elements.categoryFilter.options.length <= 1) {
            const cats = new Set();
            allCodes.forEach(c => {
                if (mensajesDB[c].categoria) cats.add(mensajesDB[c].categoria);
            });
            cats.forEach(c => {
                const op = document.createElement("option");
                op.value = c; op.textContent = c;
                this.elements.categoryFilter.appendChild(op);
            });
        }

        // 2. Filtrar
        allCodes.forEach(code => {
            const data = mensajesDB[code];
            const isUnlocked = unlockedSet.has(code);
            const isFav = favoritesSet.has(code);

            // Si está bloqueado y no buscamos nada específico, no lo mostramos en la lista general 
            // (Opcional: puedes mostrar bloqueados si quieres)
            if (!isUnlocked && searchText === "") return; 

            // Filtros
            if (onlyFav && !isFav) return;
            if (catFilter && data.categoria !== catFilter) return;
            if (searchText) {
                const matchCode = code.includes(searchText);
                const matchTitle = data.titulo && normalizeText(data.titulo).includes(searchText);
                const matchCat = data.categoria && normalizeText(data.categoria).includes(searchText);
                if (!matchCode && !matchTitle && !matchCat) return;
            }

            results.push({ code, data, isUnlocked, isFav });
        });

        this.currentFilteredData = results;
        this.updatePaginationUI();
    }

    updatePaginationUI() {
        const totalItems = this.currentFilteredData.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;

        // Asegurar página válida
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        // Calcular slice
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageItems = this.currentFilteredData.slice(start, end);

        // Renderizar lista
        this.elements.unlockedList.innerHTML = '';
        
        if (pageItems.length === 0) {
            this.elements.unlockedList.innerHTML = '<p style="text-align:center;width:100%;opacity:0.7;padding:20px;">No se encontraron secretos.</p>';
            this.elements.paginationControls.hidden = true;
            return;
        }

        pageItems.forEach(({ code, data, isUnlocked, isFav }) => {
            const li = document.createElement("li");
            li.className = isUnlocked ? "lista-codigo-item" : "lista-codigo-item locked";
            
            // Icono Izquierda
            const iconClass = isUnlocked 
                ? (data.type === 'video' ? 'fa-video' : data.type === 'image' ? 'fa-image' : 'fa-file-alt')
                : 'fa-lock';
            
            // Texto (Nombre o ?????)
            const displayText = isUnlocked 
                ? (data.titulo || code) // Usar título si existe, sino código
                : "??????";

            // HTML Estructura Grid
            li.innerHTML = `
                <i class="fas ${iconClass} lock-icon" style="opacity:0.7"></i>
                
                <div class="codigo-info">
                    <span class="codigo-text">${displayText}</span>
                </div>
                
                ${isUnlocked ? `<span class="category">${data.categoria || 'Varios'}</span>` : ''}
                
                ${isUnlocked ? `
                <button class="favorite-toggle-btn ${isFav ? 'active' : ''}" title="Favorito">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>` : ''}
            `;

            // Eventos
            if (isUnlocked) {
                // Click en el item abre el contenido
                li.addEventListener('click', (e) => {
                    // Si el click fue en el corazón, no abrir contenido
                    if (e.target.closest('.favorite-toggle-btn')) return;
                    
                    if (this.onCodeSelected) {
                        this.onCodeSelected(code);
                        this.elements.contentDiv.hidden = false;
                        this.elements.contentDiv.scrollIntoView({ behavior: 'smooth' });
                        // En móvil, ocultar la lista al seleccionar para dar espacio
                        if (window.innerWidth < 768) {
                            this.elements.unlockedSection.hidden = true;
                        }
                    }
                });

                // Click en Corazón
                const favBtn = li.querySelector('.favorite-toggle-btn');
                favBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // No abrir carta
                    if (this.onToggleFavorite) {
                        this.onToggleFavorite(code);
                        // No repintamos toda la lista para no perder la animación, solo el icono
                        // Pero GameEngine llamará a renderUnlockedList, así que se actualizará solo.
                    }
                });
            } else {
                li.onclick = () => this.showToast("🔒 ¡Sigue buscando!");
            }

            this.elements.unlockedList.appendChild(li);
        });

        // Actualizar Controles de Paginación
        this.elements.paginationControls.hidden = totalPages <= 1;
        this.elements.pageIndicator.textContent = `${this.currentPage} / ${totalPages}`;
        this.elements.prevPageBtn.disabled = this.currentPage === 1;
        this.elements.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    changePage(delta) {
        this.currentPage += delta;
        this.updatePaginationUI();
    }

    // ... [Resto de métodos existentes: showToast, updateProgress, clearContent, etc.] ...
    
    showToast(msg) {
        const toast = document.createElement("div");
        toast.className = "achievement-toast";
        toast.innerHTML = `<i class="fas fa-info-circle"></i> ${msg}`;
        this.elements.toastContainer.appendChild(toast);
        // Audio feedback sutil
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // Silent placeholder or real beep
        // setTimeout(() => toast.remove(), 4000); // Animation handles removal via CSS usually
        toast.addEventListener('animationend', (e) => {
            if (e.animationName === 'fadeOut') toast.remove();
        });
    }

    updateProgress(unlockedCount, totalCount) {
        const percent = Math.floor((unlockedCount / totalCount) * 100);
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${unlockedCount} de ${totalCount} secretos encontrados`;
    }

    clearContent() {
        this.elements.contentDiv.innerHTML = '';
        this.elements.contentDiv.hidden = true;
        this.elements.input.value = '';
        this.elements.input.focus();
    }

    displayContent(data, code) {
        this.elements.contentDiv.hidden = false;
        this.elements.contentDiv.innerHTML = '';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.style.marginBottom = '10px';
        title.textContent = data.titulo || code; // Usar título si existe
        this.elements.contentDiv.appendChild(title);

        if (data.type === "text") {
            const p = document.createElement("p");
            p.className = "mensaje-texto";
            p.innerText = data.texto;
            this.elements.contentDiv.appendChild(p);
        } 
        else if (data.type === "image") {
            const img = document.createElement("img");
            img.src = data.url;
            img.alt = "Secreto desbloqueado";
            img.onload = () => {
                // ViewerJS para zoom
                new Viewer(img, { toolbar: false, navbar: false, title: false });
            };
            this.elements.contentDiv.appendChild(img);
        } 
        else if (data.type === "video") {
            const wrapper = document.createElement("div");
            wrapper.className = "video-wrapper";
            
            const loader = document.createElement("div");
            loader.className = "video-loader";
            
            const iframe = document.createElement("iframe");
            iframe.className = "video-frame";
            iframe.src = data.url; 
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.onload = () => {
                iframe.style.opacity = "1";
                loader.style.display = "none";
            };

            wrapper.appendChild(loader);
            wrapper.appendChild(iframe);
            this.elements.contentDiv.appendChild(wrapper);
        }
        else if (data.type === "download") { // WENC o Archivo
            this.renderDownloadCard(data);
        }
    }

    // Render de herramientas y wenc (se mantiene igual o similar)
    renderDownloadCard(data) {
        const card = document.createElement("div");
        card.className = "glass-card";
        card.style.margin = "0 auto";
        
        card.innerHTML = `
            <i class="fas fa-file-lock" style="font-size:3em; margin-bottom:15px; color:var(--highlight-pink);"></i>
            <h3>Archivo Protegido</h3>
            <p>${data.descarga.nombre}</p>
            <div class="input-container" style="margin-top:15px;">
                <input type="password" id="wencPassword" placeholder="Contraseña..." style="width:100%; margin-bottom:10px;">
                <button id="btnDecrypt" class="button" style="width:100%">Desbloquear</button>
            </div>
            <div id="decryptProgress" style="width:100%; background:#333; height:5px; margin-top:10px; border-radius:3px;" hidden>
                <div id="decryptBar" style="width:0%; height:100%; background:var(--highlight-pink); transition:width 0.2s;"></div>
            </div>
        `;

        const btn = card.querySelector("#btnDecrypt");
        const passInput = card.querySelector("#wencPassword");
        
        btn.onclick = async () => {
            const pass = passInput.value;
            if(!pass) return this.showToast("Introduce la contraseña");
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            card.querySelector("#decryptProgress").hidden = false;
            const bar = card.querySelector("#decryptBar");

            try {
                const blob = await descifrarArchivo(data.descarga.url, data.descarga.nombre, pass, (percent) => {
                    bar.style.width = percent + "%";
                });
                this.showMediaModal(blob, data.descarga.nombre);
                btn.innerHTML = "Desbloquear";
                btn.disabled = false;
            } catch (e) {
                this.showToast("Error: Contraseña incorrecta");
                btn.innerHTML = "Reintentar";
                btn.disabled = false;
            }
        };

        this.elements.contentDiv.appendChild(card);
    }

    showMediaModal(blob, filename) {
        const url = URL.createObjectURL(blob);
        const type = blob.type;
        const overlay = document.createElement("div");
        overlay.className = "media-modal-overlay";
        
        const container = document.createElement("div");
        container.className = "glass-card";
        container.style.width = "95%";
        container.style.maxWidth = "600px";
        container.style.maxHeight = "90vh";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        
        let content;
        if (type.startsWith("image/")) {
            content = document.createElement("img");
            content.src = url;
            content.className = "secure-media";
        } else if (type.startsWith("video/")) {
            content = document.createElement("video");
            content.src = url;
            content.controls = true;
            content.className = "secure-media";
        } else if (type.startsWith("audio/")) {
            content = document.createElement("audio");
            content.src = url;
            content.controls = true;
            content.style.width = "100%";
            content.style.marginTop = "20px";
        } else {
            content = document.createElement("div");
            content.innerHTML = `<p>Archivo descifrado listo.</p>`;
        }

        const controls = document.createElement("div");
        controls.className = "media-controls";
        controls.style.marginTop = "20px";
        controls.style.justifyContent = "center";

        const btnDownload = document.createElement("a");
        btnDownload.href = url;
        btnDownload.download = filename.replace(".wenc", "");
        btnDownload.className = "media-btn";
        btnDownload.innerHTML = '<i class="fas fa-download"></i> Guardar';

        const btnClose = document.createElement("button");
        btnClose.className = "media-btn";
        btnClose.innerHTML = '<i class="fas fa-times"></i> Cerrar';
        btnClose.onclick = () => {
            URL.revokeObjectURL(url);
            overlay.remove();
        };

        controls.appendChild(btnDownload);
        controls.appendChild(btnClose);
        
        container.appendChild(content);
        container.appendChild(controls);
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }
    
    togglePanel(panel, show) {
        if(show) panel.classList.add('show');
        else panel.classList.remove('show');
    }

    renderTools() {
        this.elements.toolsListContainer.innerHTML = '';
        herramientasExternas.forEach(tool => {
            const card = document.createElement("div");
            card.className = "tool-card";
            card.innerHTML = `
                <div class="tool-header"><i class="${tool.icono}"></i> ${tool.nombre}</div>
                <div class="tool-desc">${tool.descripcion}</div>
                <a href="${tool.url}" target="_blank" class="tool-btn">Abrir</a>
            `;
            this.elements.toolsListContainer.appendChild(card);
        });
    }
}
