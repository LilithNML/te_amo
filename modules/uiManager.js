/**
 * modules/uiManager.js
 * Actualizado con: Confeti Realista, Typewriter & Lazy Video Load
 */

import { normalizeText } from './utils.js';
import { herramientasExternas } from './data.js';

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
            closeModalBtn: document.getElementById("closeModalBtn"),
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
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn")
        };

        this.showingFavoritesOnly = false;
        this.panzoomInstance = null;
        this.typewriterTimeout = null; // Para cancelar escritura si se cambia rápido

        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
        this.setupModalListeners();
    }

    dismissKeyboard() {
        if (this.elements.input) this.elements.input.blur();
    }

    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") document.body.classList.add("dark-mode");
    }

    toggleDarkMode() {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        this.showToast(isDark ? "Modo Oscuro Activado" : "Modo Claro Activado");
    }

    // --- MENÚS (Sin cambios significativos, resumido) ---
    setupMenuListeners() {
        this.elements.menuButton.addEventListener("click", (e) => { e.stopPropagation(); this.elements.dropdownMenu.classList.toggle("show"); });
        document.addEventListener("click", (e) => { if (!this.elements.menuButton.contains(e.target) && !this.elements.dropdownMenu.contains(e.target)) this.elements.dropdownMenu.classList.remove("show"); });
        
        this.bindMenuAction("menuHome", () => { this.toggleUnlockedPanel(false); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        this.bindMenuAction("menuShowUnlocked", () => this.toggleUnlockedPanel(true));
        this.bindMenuAction("menuFavorites", () => { this.toggleUnlockedPanel(true); this.showingFavoritesOnly = true; this.updateFilterUI(); this.triggerListFilter(); });
        this.bindMenuAction("menuDarkMode", () => this.toggleDarkMode());
        this.bindMenuAction("menuAudio", () => this.openPanel(this.elements.audioPanel));
        this.bindMenuAction("menuTools", () => { this.renderTools(); this.openPanel(this.elements.toolsPanel); });
        this.bindMenuAction("menuExport", () => this.exportProgress());
        this.bindMenuAction("menuImport", () => this.elements.importInput.click());
        
        this.elements.importInput.addEventListener("change", (e) => { if (e.target.files.length > 0) this.handleImportFile(e.target.files[0]); this.elements.importInput.value = ""; });
        if(this.elements.closeAudioPanel) this.elements.closeAudioPanel.addEventListener("click", () => this.closePanel(this.elements.audioPanel));
        if(this.elements.closeToolsPanel) this.elements.closeToolsPanel.addEventListener("click", () => this.closePanel(this.elements.toolsPanel));
    }

    bindMenuAction(id, fn) { const el = document.getElementById(id); if(el) el.addEventListener("click", () => { fn(); this.elements.dropdownMenu.classList.remove("show"); }); }
    openPanel(p) { if(p) { p.classList.add("show"); p.setAttribute("aria-hidden", "false"); } }
    closePanel(p) { if(p) { p.classList.remove("show"); p.setAttribute("aria-hidden", "true"); } }

    renderTools() {
        const c = this.elements.toolsListContainer; if(!c) return; c.innerHTML = "";
        herramientasExternas.forEach(t => {
            const div = document.createElement("div"); div.className = "tool-card";
            div.innerHTML = `<div class="tool-header"><i class="${t.icono}"></i> ${t.nombre}</div><div class="tool-desc">${t.descripcion}</div><a href="${t.url}" target="_blank" rel="noopener noreferrer" class="tool-btn">Abrir <i class="fas fa-external-link-alt"></i></a>`;
            c.appendChild(div);
        });
    }

    // --- MODAL ZOOM (CON FIX TÁCTIL) ---
    setupModalListeners() {
        if (this.elements.closeModalBtn) this.elements.closeModalBtn.addEventListener("click", () => this.closeModal());
        document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && this.elements.modal.style.display === "flex") this.closeModal(); });
        let lastTap = 0;
        this.elements.modalImg.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
                if (this.panzoomInstance) {
                    const currentScale = this.panzoomInstance.getScale();
                    this.panzoomInstance.zoom(currentScale === 1 ? 2.5 : 1, { animate: true });
                }
            }
            lastTap = currentTime;
        });
    }

    openModal(src) {
        this.elements.modal.style.display = "flex";
        this.elements.modalImg.src = src;
        if (this.panzoomInstance) { this.panzoomInstance.dispose(); this.panzoomInstance = null; }
        this.elements.modalImg.onload = () => {
            // @ts-ignore
            this.panzoomInstance = Panzoom(this.elements.modalImg, { maxScale: 5, minScale: 1, contain: 'inside', startScale: 1, touchAction: 'none', animate: true });
            this.elements.modalImg.parentElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);
        };
    }

    closeModal() {
        this.elements.modal.style.display = "none";
        this.elements.modalImg.src = "";
        if (this.panzoomInstance) { this.panzoomInstance.dispose(); this.panzoomInstance = null; }
    }

    // =================================================================
    // EFECTOS ESPECIALES: CONFETI & TYPEWRITER
    // =================================================================

    /**
     * Dispara confeti realista (físicas de papel cayendo)
     */
    triggerConfetti() {
        // Verificar si la librería está cargada
        // @ts-ignore
        if (typeof confetti === 'undefined') return;

        // Disparo múltiple para efecto natural
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

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }

    /**
     * Escribe texto letra por letra (Máquina de escribir)
     */
    typeWriterEffect(element, text) {
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
        
        element.innerHTML = ""; // Limpiar
        element.classList.add("typewriter-cursor"); // Añadir cursor
        
        let i = 0;
        const speed = 100; // Velocidad en ms por letra

        const type = () => {
            if (i < text.length) {
                // Manejo básico de saltos de línea
                if (text.charAt(i) === '\n') {
                    element.innerHTML += '<br>';
                } else {
                    element.textContent += text.charAt(i);
                }
                i++;
                this.typewriterTimeout = setTimeout(type, speed);
            } else {
                element.classList.remove("typewriter-cursor"); // Quitar cursor al final
            }
        };
        type();
    }

    // =================================================================
    // RENDERIZADO CON MEJORAS
    // =================================================================

    renderContent(data, key) {
        // Limpiar timeouts previos si cambiamos rápido de contenido
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);

        const c = this.elements.contentDiv;
        c.hidden = false;
        c.innerHTML = "";

        const h2 = document.createElement("h2");
        h2.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        h2.style.textTransform = "capitalize";
        c.appendChild(h2);

        // LÓGICA DE TEXTO: MÁQUINA DE ESCRIBIR VS NORMAL
        if (data.texto && data.type !== 'text') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            c.appendChild(p);
        }

        switch (data.type) {
            case "text":
                const pText = document.createElement("p");
                pText.className = "mensaje-texto";
                
                // Si la categoría es "Pensamiento" (o lo que definas), usa Typewriter
                if (data.categoria && data.categoria.toLowerCase() === 'pensamiento') {
                    this.typeWriterEffect(pText, data.texto);
                } else {
                    // Texto normal
                    pText.textContent = data.texto;
                }
                c.appendChild(pText);
                break;

            case "image":
                const img = document.createElement("img");
                img.src = data.imagen;
                img.alt = "Imagen secreta";
                img.style.cursor = "pointer";
                img.onclick = () => this.openModal(data.imagen);
                c.appendChild(img);
                break;

            case "video":
                if (data.videoEmbed) {
                    // Contenedor Wrapper
                    const wrapper = document.createElement("div");
                    wrapper.className = "video-wrapper";

                    // Loader Spinner
                    const loader = document.createElement("div");
                    loader.className = "video-loader";

                    // Iframe
                    const iframe = document.createElement("iframe");
                    iframe.src = data.videoEmbed;
                    iframe.className = "video-frame";
                    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
                    
                    // Lazy Loading Logic
                    iframe.onload = () => {
                        loader.style.display = "none"; // Ocultar spinner
                        iframe.style.opacity = "1";    // Mostrar video suavemente
                    };

                    wrapper.appendChild(loader);
                    wrapper.appendChild(iframe);
                    c.appendChild(wrapper);
                }
                break;

            case "link":
                const a = document.createElement("a");
                a.href = data.link; a.target = "_blank"; a.className = "button";
                a.innerHTML = 'Abrir Enlace <i class="fas fa-external-link-alt"></i>';
                c.appendChild(a);
                break;

            case "download":
                const dl = document.createElement("a");
                dl.href = data.descarga.url; dl.download = data.descarga.nombre; dl.className = "button";
                dl.innerHTML = `<i class="fas fa-download"></i> Descargar ${data.descarga.nombre}`;
                c.appendChild(dl);
                break;
        }

        c.classList.remove("fade-in");
        void c.offsetWidth;
        c.classList.add("fade-in");
    }

    // ... (El resto de métodos auxiliares showError, showSuccess, etc. se mantienen igual) ...
    renderMessage(title, body) { const c = this.elements.contentDiv; c.hidden = false; c.innerHTML = `<h2>${title}</h2><p>${body}</p>`; c.classList.remove("fade-in"); void c.offsetWidth; c.classList.add("fade-in"); }
    showError() { this.elements.input.classList.add("shake", "error"); setTimeout(() => this.elements.input.classList.remove("shake"), 500); }
    showSuccess() { this.elements.input.classList.remove("error"); this.elements.input.classList.add("success"); }
    clearInput() { this.elements.input.value = ""; }
    updateProgress(u, t) { const p = t > 0 ? Math.round((u / t) * 100) : 0; this.elements.progressBar.style.width = `${p}%`; this.elements.progressText.textContent = `Descubiertos: ${u} / ${t}`; }
    showToast(msg) { const t = document.createElement("div"); t.className = "achievement-toast"; t.textContent = msg; this.elements.toastContainer.appendChild(t); setTimeout(() => t.remove(), 4000); }
    updateAudioUI(p, n) { const b = document.getElementById("audioPlayPause"); const t = document.getElementById("trackName"); if (b) b.innerHTML = p ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'; if (t && n) t.textContent = n.replace(/_/g, " ").replace(/\.[^/.]+$/, ""); }
    
    // Listas y Filtros
    setupListListeners() { this.elements.searchUnlocked.addEventListener("input", () => this.triggerListFilter()); this.elements.categoryFilter.addEventListener("change", () => this.triggerListFilter()); this.elements.filterFavBtn.addEventListener("click", () => { this.showingFavoritesOnly = !this.showingFavoritesOnly; this.updateFilterUI(); this.triggerListFilter(); }); this.elements.closeUnlockedBtn.addEventListener("click", () => this.toggleUnlockedPanel(false)); }
    toggleUnlockedPanel(show) { this.elements.unlockedSection.hidden = !show; if (show) this.elements.unlockedSection.scrollIntoView({ behavior: 'smooth' }); }
    updateFilterUI() { const btn = this.elements.filterFavBtn; if (this.showingFavoritesOnly) { btn.classList.add("active"); btn.innerHTML = '<i class="fas fa-heart"></i> Mostrando Favoritos'; } else { btn.classList.remove("active"); btn.innerHTML = '<i class="far fa-heart"></i> Solo Favoritos'; } }
    renderUnlockedList(u, f, m) { this.currentData = { unlockedSet: u, favoritesSet: f, mensajesData: m }; const cats = new Set(); u.forEach(c => { if (m[c]) cats.add(m[c].categoria); }); const cur = this.elements.categoryFilter.value; this.elements.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>'; cats.forEach(ca => { const o = document.createElement("option"); o.value = ca; o.textContent = ca; if (ca === cur) o.selected = true; this.elements.categoryFilter.appendChild(o); }); this.triggerListFilter(); }
    triggerListFilter() { if (!this.currentData) return; const { unlockedSet, favoritesSet, mensajesData } = this.currentData; const s = normalizeText(this.elements.searchUnlocked.value); const cat = this.elements.categoryFilter.value; this.elements.unlockedList.innerHTML = ""; let vc = 0; Array.from(unlockedSet).sort().forEach(code => { const d = mensajesData[code]; if (!d) return; if (this.showingFavoritesOnly && !favoritesSet.has(code)) return; if (s && !normalizeText(code).includes(s)) return; if (cat && d.categoria !== cat) return; vc++; const li = document.createElement("li"); li.className = "lista-codigo-item"; li.innerHTML = `<div style="flex-grow:1"><span class="codigo-text">${code}</span><span class="category">${d.categoria}</span></div>`; const fb = document.createElement("button"); fb.className = `favorite-toggle-btn ${favoritesSet.has(code) ? 'active' : ''}`; fb.innerHTML = `<i class="${favoritesSet.has(code) ? 'fas' : 'far'} fa-heart"></i>`; fb.onclick = (e) => { e.stopPropagation(); if (this.onToggleFavorite) this.onToggleFavorite(code); }; li.onclick = () => { if (this.onCodeSelected) this.onCodeSelected(code); this.elements.contentDiv.scrollIntoView({ behavior: 'smooth' }); }; li.appendChild(fb); this.elements.unlockedList.appendChild(li); }); if (vc === 0) this.elements.unlockedList.innerHTML = '<p style="text-align:center; width:100%; opacity:0.7">Sin resultados.</p>'; }
    
    // Import/Export
    exportProgress() { const d = { unlocked: JSON.parse(localStorage.getItem("desbloqueados")||"[]"), favorites: JSON.parse(localStorage.getItem("favoritos")||"[]"), achievements: JSON.parse(localStorage.getItem("logrosAlcanzados")||"[]"), timestamp: new Date().toISOString() }; const b = new Blob([JSON.stringify(d,null,2)],{type:"application/json"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download=`progreso_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(u); this.showToast("Progreso exportado correctamente"); }
    handleImportFile(f) { const r = new FileReader(); r.onload=(e)=>{try{const d=JSON.parse(e.target.result);if(this.onImportData)this.onImportData(d);}catch(err){this.showToast("Error: El archivo no es válido");}}; r.readAsText(f); }
}
