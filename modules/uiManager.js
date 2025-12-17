/**
 * modules/uiManager.js
 * ------------------------------------------------------------------
 * Gestor de Interfaz de Usuario (UI Manager).
 * VERSIÓN DEFINITIVA: Implementación de Viewer.js para zoom perfecto.
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
            
            // ELIMINADOS: Elementos del modal manual (ViewerJS no los necesita)
            
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
        this.typewriterTimeout = null;

        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
        // setupModalListeners YA NO ES NECESARIO
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

    // =================================================================
    // GESTIÓN DE MENÚS Y PANELES
    // =================================================================

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

        if (this.elements.closeAudioPanel) this.elements.closeAudioPanel.addEventListener("click", () => this.closePanel(this.elements.audioPanel));
        if (this.elements.closeToolsPanel) this.elements.closeToolsPanel.addEventListener("click", () => this.closePanel(this.elements.toolsPanel));
    }

    bindMenuAction(id, fn) { const btn = document.getElementById(id); if (btn) btn.addEventListener("click", () => { fn(); this.elements.dropdownMenu.classList.remove("show"); }); }
    openPanel(p) { if (p) { p.classList.add("show"); p.setAttribute("aria-hidden", "false"); } }
    closePanel(p) { if (p) { p.classList.remove("show"); p.setAttribute("aria-hidden", "true"); } }

    renderTools() {
        const c = this.elements.toolsListContainer; if (!c) return; c.innerHTML = "";
        herramientasExternas.forEach(tool => {
            const div = document.createElement("div"); div.className = "tool-card";
            div.innerHTML = `<div class="tool-header"><i class="${tool.icono}"></i> ${tool.nombre}</div><div class="tool-desc">${tool.descripcion}</div><a href="${tool.url}" target="_blank" rel="noopener noreferrer" class="tool-btn">Abrir <i class="fas fa-external-link-alt"></i></a>`;
            c.appendChild(div);
        });
    }

    // =================================================================
    // EFECTOS VISUALES
    // =================================================================

    triggerConfetti() {
        // @ts-ignore
        if (typeof confetti === 'undefined') return;
        var count = 200; var defaults = { origin: { y: 0.7 }, zIndex: 1500 };
        function fire(particleRatio, opts) {
            // @ts-ignore
            confetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * particleRatio) }));
        }
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
    }

    typeWriterEffect(element, text) {
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
        element.innerHTML = ""; element.classList.add("typewriter-cursor");
        let i = 0;
        const slowSpeed = 70; const fastSpeed = 40; const accelerationChars = 100;
        const type = () => {
            if (i >= text.length) { element.classList.remove("typewriter-cursor"); return; }
            const char = text.charAt(i);
            if (char === '\n') { element.appendChild(document.createElement('br')); } 
            else { element.appendChild(document.createTextNode(char)); }
            let speed = i < accelerationChars ? slowSpeed : fastSpeed;
            if (char === '.' || char === '!' || char === '?') speed += 300;
            if (char === '\n') speed += 500;
            i++; this.typewriterTimeout = setTimeout(type, speed);
        };
        type();
    }

    // =================================================================
    // RENDERIZADO DE CONTENIDO
    // =================================================================

    renderContent(data, key) {
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
        const container = this.elements.contentDiv; container.hidden = false; container.innerHTML = "";

        const h2 = document.createElement("h2");
        h2.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        h2.style.textTransform = "capitalize";
        container.appendChild(h2);

        if (data.texto && data.type !== 'text') {
            const p = document.createElement("p"); p.textContent = data.texto; container.appendChild(p);
        }

        switch (data.type) {
            case "text":
                const pText = document.createElement("p"); pText.className = "mensaje-texto";
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
                img.alt = "Imagen secreta";
                img.style.cursor = "zoom-in"; // Indicador visual
                
                // === AQUÍ ESTÁ LA SOLUCIÓN DEFINITIVA DE ZOOM ===
                // ViewerJS maneja todo: modal, gestos, zoom, cierre.
                img.onclick = () => {
                    // @ts-ignore
                    const viewer = new Viewer(img, {
                        hidden() { viewer.destroy(); }, // Limpieza al cerrar
                        toolbar: {
                            zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1,
                            rotateLeft: 0, rotateRight: 0, flipHorizontal: 0, flipVertical: 0,
                        },
                        navbar: false,
                        title: false,
                        transition: true
                    });
                    viewer.show();
                };
                
                container.appendChild(img);
                break;

            case "video":
                if (data.videoEmbed) {
                    const wrapper = document.createElement("div"); wrapper.className = "video-wrapper";
                    const loader = document.createElement("div"); loader.className = "video-loader";
                    const iframe = document.createElement("iframe");
                    iframe.src = data.videoEmbed; iframe.className = "video-frame";
                    iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
                    iframe.onload = () => { loader.style.display = "none"; iframe.style.opacity = "1"; };
                    wrapper.appendChild(loader); wrapper.appendChild(iframe); container.appendChild(wrapper);
                }
                break;

            case "link":
                const a = document.createElement("a"); a.href = data.link; a.target = "_blank"; a.rel = "noopener noreferrer"; a.className = "button";
                a.innerHTML = 'Abrir Enlace <i class="fas fa-external-link-alt"></i>'; container.appendChild(a); break;

            case "download":
                const dl = document.createElement("a"); dl.href = data.descarga.url; dl.download = data.descarga.nombre; dl.className = "button";
                dl.innerHTML = `<i class="fas fa-download"></i> Descargar ${data.descarga.nombre}`; container.appendChild(dl); break;
        }

        container.classList.remove("fade-in"); void container.offsetWidth; container.classList.add("fade-in");
    }

    renderMessage(titleText, bodyHTML) {
        const c = this.elements.contentDiv; c.hidden = false; c.innerHTML = `<h2>${titleText}</h2><p>${bodyHTML}</p>`;
        c.classList.remove("fade-in"); void c.offsetWidth; c.classList.add("fade-in");
    }

    // =================================================================
    // UI HELPERS
    // =================================================================

    showError() { this.elements.input.classList.add("shake", "error"); setTimeout(() => this.elements.input.classList.remove("shake"), 500); }
    showSuccess() { this.elements.input.classList.remove("error"); this.elements.input.classList.add("success"); }
    clearInput() { this.elements.input.value = ""; }
    updateProgress(u, t) { const p = t > 0 ? Math.round((u / t) * 100) : 0; this.elements.progressBar.style.width = `${p}%`; this.elements.progressText.textContent = `Descubiertos: ${u} / ${t}`; }
    showToast(msg) { const t = document.createElement("div"); t.className = "achievement-toast"; t.textContent = msg; this.elements.toastContainer.appendChild(t); setTimeout(() => t.remove(), 4000); }
    updateAudioUI(p, n) { const btn = document.getElementById("audioPlayPause"); const txt = document.getElementById("trackName"); if (btn) btn.innerHTML = p ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'; if (txt && n) txt.textContent = n.replace(/_/g, " ").replace(/\.[^/.]+$/, ""); }

    // =================================================================
    // LISTAS Y FILTROS
    // =================================================================

    setupListListeners() {
        this.elements.searchUnlocked.addEventListener("input", () => this.triggerListFilter());
        this.elements.categoryFilter.addEventListener("change", () => this.triggerListFilter());
        this.elements.filterFavBtn.addEventListener("click", () => { this.showingFavoritesOnly = !this.showingFavoritesOnly; this.updateFilterUI(); this.triggerListFilter(); });
        this.elements.closeUnlockedBtn.addEventListener("click", () => this.toggleUnlockedPanel(false));
    }

    toggleUnlockedPanel(show) { this.elements.unlockedSection.hidden = !show; if (show) this.elements.unlockedSection.scrollIntoView({ behavior: 'smooth' }); }
    updateFilterUI() { const btn = this.elements.filterFavBtn; if (this.showingFavoritesOnly) { btn.classList.add("active"); btn.innerHTML = '<i class="fas fa-heart"></i> Mostrando Favoritos'; } else { btn.classList.remove("active"); btn.innerHTML = '<i class="far fa-heart"></i> Solo Favoritos'; } }

    renderUnlockedList(unlockedSet, favoritesSet, mensajesData) {
        this.currentData = { unlockedSet, favoritesSet, mensajesData };
        const categories = new Set();
        unlockedSet.forEach(code => { if (mensajesData[code]) categories.add(mensajesData[code].categoria); });
        const currentCat = this.elements.categoryFilter.value;
        this.elements.categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
        categories.forEach(cat => { const opt = document.createElement("option"); opt.value = cat; opt.textContent = cat; if (cat === currentCat) opt.selected = true; this.elements.categoryFilter.appendChild(opt); });
        this.triggerListFilter();
    }

    triggerListFilter() {
        if (!this.currentData) return;
        const { unlockedSet, favoritesSet, mensajesData } = this.currentData;
        const s = normalizeText(this.elements.searchUnlocked.value);
        const cat = this.elements.categoryFilter.value;
        this.elements.unlockedList.innerHTML = "";
        let vc = 0;
        Array.from(unlockedSet).sort().forEach(code => {
            const d = mensajesData[code]; if (!d) return;
            if (this.showingFavoritesOnly && !favoritesSet.has(code)) return;
            if (s && !normalizeText(code).includes(s)) return;
            if (cat && d.categoria !== cat) return;
            vc++;
            const li = document.createElement("li"); li.className = "lista-codigo-item";
            li.innerHTML = `<div style="flex-grow:1"><span class="codigo-text">${code}</span><span class="category">${d.categoria}</span></div>`;
            const favBtn = document.createElement("button"); favBtn.className = `favorite-toggle-btn ${favoritesSet.has(code) ? 'active' : ''}`;
            favBtn.innerHTML = `<i class="${favoritesSet.has(code) ? 'fas' : 'far'} fa-heart"></i>`;
            favBtn.onclick = (e) => { e.stopPropagation(); if (this.onToggleFavorite) this.onToggleFavorite(code); };
            li.onclick = () => { if (this.onCodeSelected) this.onCodeSelected(code); this.elements.contentDiv.scrollIntoView({ behavior: 'smooth' }); };
            li.appendChild(favBtn); this.elements.unlockedList.appendChild(li);
        });
        if (vc === 0) this.elements.unlockedList.innerHTML = '<p style="text-align:center; width:100%; opacity:0.7">Sin resultados.</p>';
    }

    // =================================================================
    // IMPORT / EXPORT
    // =================================================================

    exportProgress() {
        const d = { unlocked: JSON.parse(localStorage.getItem("desbloqueados")||"[]"), favorites: JSON.parse(localStorage.getItem("favoritos")||"[]"), achievements: JSON.parse(localStorage.getItem("logrosAlcanzados")||"[]"), timestamp: new Date().toISOString() };
        const b = new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
        const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download=`progreso_${new Date().toISOString().slice(0,10)}.json`;
        a.click(); URL.revokeObjectURL(u); this.showToast("Progreso exportado correctamente");
    }

    handleImportFile(f) {
        const r = new FileReader();
        r.onload=(e)=>{ try { const d=JSON.parse(e.target.result); if(this.onImportData) this.onImportData(d); } catch(err) { this.showToast("Error: El archivo no es válido"); } };
        r.readAsText(f);
    }
}
