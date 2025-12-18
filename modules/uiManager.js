/**
 * modules/uiManager.js
 * ------------------------------------------------------------------
 * Gestor de Interfaz de Usuario (UI Manager).
 * VERSIÓN FINAL CORREGIDA:
 * - Soporte para archivos locales (type: "internal")
 * - Viewer.js para imágenes
 * - Partículas y efectos visuales
 * - Variables unificadas para evitar errores
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
        
        this.initDynamicPlaceholder();
        setTimeout(() => this.initParticles(), 100); 
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
    // PARTICULAS & EFECTOS
    // =================================================================

    async initParticles() {
        // @ts-ignore
        if (typeof tsParticles === 'undefined') {
            console.warn("Cargando partículas...");
            setTimeout(() => this.initParticles(), 500);
            return;
        }
        // @ts-ignore
        await tsParticles.load('tsparticles', {
            fpsLimit: 60,
            fullScreen: { enable: false },
            particles: {
                number: { value: 40, density: { enable: true, area: 800 } },
                color: { value: ["#ffffff", "#ff7aa8", "#ffd700"] },
                shape: { type: "circle" },
                opacity: { value: 0.7, random: true, animation: { enable: true, speed: 1, minimumValue: 0.3, sync: false } },
                size: { value: 4, random: true, animation: { enable: true, speed: 3, minimumValue: 1, sync: false } },
                move: { enable: true, speed: 0.8, direction: "none", random: true, straight: false, outModes: "out" }
            },
            interactivity: { events: { onHover: { enable: true, mode: "bubble" }, onClick: { enable: true, mode: "push" }, resize: true }, modes: { bubble: { distance: 200, size: 6, duration: 2, opacity: 1 }, push: { quantity: 4 } } },
            detectRetina: true
        });
    }

    initDynamicPlaceholder() {
        const frases = ["Escribe aquí...", "Prueba con una fecha especial...", "¿Recuerdas nuestro lugar?...", "Intenta con un apodo cariñoso...", "El nombre de nuestra canción..."];
        let index = 0;
        setInterval(() => {
            index = (index + 1) % frases.length;
            this.elements.input.setAttribute("placeholder", frases[index]);
        }, 3500);
    }

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
        let i = 0; const slowSpeed = 70; const fastSpeed = 40; const accelerationChars = 100;
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
    // RENDERIZADO DE CONTENIDO (Aquí estaba el error)
    // =================================================================

    renderContent(data, key) {
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
        
        // UNIFICACIÓN DE VARIABLE: Usaremos 'container' siempre
        const container = this.elements.contentDiv; 
        
        container.hidden = false;
        container.innerHTML = "";

        const h2 = document.createElement("h2");
        h2.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        h2.style.textTransform = "capitalize";
        container.appendChild(h2);

        if (data.texto && data.type !== 'text' && data.type !== 'internal') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            container.appendChild(p);
        }

        switch (data.type) {
            case "text":
                const pText = document.createElement("p");
                pText.className = "mensaje-texto";
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
                img.style.cursor = "zoom-in";
                img.onclick = () => {
                    // @ts-ignore
                    const viewer = new Viewer(img, { hidden() { viewer.destroy(); }, toolbar: { zoomIn: 1, zoomOut: 1, oneToOne: 1, reset: 1, rotateLeft: 0, rotateRight: 0, flipHorizontal: 0, flipVertical: 0 }, navbar: false, title: false, transition: true });
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

            // --- NUEVO CASO: ARCHIVOS LOCALES ---
            case "internal":
                const internalWrapper = document.createElement("div");
                internalWrapper.className = "internal-wrapper";
                
                // Botón Pantalla Completa
                const fullScreenBtn = document.createElement("a");
                fullScreenBtn.href = data.archivo;
                fullScreenBtn.target = "_blank";
                fullScreenBtn.className = "button small-button";
                fullScreenBtn.innerHTML = '<i class="fas fa-expand"></i> Pantalla Completa';
                fullScreenBtn.style.marginBottom = "10px";

                // Iframe Interno
                const internalFrame = document.createElement("iframe");
                internalFrame.src = data.archivo;
                internalFrame.className = "internal-frame";
                internalFrame.style.border = "none";
                internalFrame.style.backgroundColor = "#fff"; // Fondo blanco para documentos

                internalWrapper.appendChild(fullScreenBtn);
                internalWrapper.appendChild(internalFrame);
                
                container.appendChild(internalWrapper);
                break;

            case "link":
                const a = document.createElement("a"); a.href = data.link; a.target = "_blank"; a.className = "button"; a.innerHTML = 'Abrir Enlace <i class="fas fa-external-link-alt"></i>'; container.appendChild(a); break;

            case "download":
                const dl = document.createElement("a"); dl.href = data.descarga.url; dl.download = data.descarga.nombre; dl.className = "button"; dl.innerHTML = `<i class="fas fa-download"></i> Descargar ${data.descarga.nombre}`; container.appendChild(dl); break;
        }

        container.classList.remove("fade-in");
        void container.offsetWidth;
        container.classList.add("fade-in");
    }

    renderMessage(title, body) { const c = this.elements.contentDiv; c.hidden = false; c.innerHTML = `<h2>${title}</h2><p>${body}</p>`; c.classList.remove("fade-in"); void c.offsetWidth; c.classList.add("fade-in"); }
    showError() { this.elements.input.classList.add("shake", "error"); setTimeout(() => this.elements.input.classList.remove("shake"), 500); }
    showSuccess() { this.elements.input.classList.remove("error"); this.elements.input.classList.add("success"); }
    clearInput() { this.elements.input.value = ""; }
    updateProgress(u, t) { const p = t > 0 ? Math.round((u / t) * 100) : 0; this.elements.progressBar.style.width = `${p}%`; this.elements.progressText.textContent = `Descubiertos: ${u} / ${t}`; }
    showToast(msg) { const t = document.createElement("div"); t.className = "achievement-toast"; t.textContent = msg; this.elements.toastContainer.appendChild(t); setTimeout(() => t.remove(), 4000); }
    updateAudioUI(p, n) { const b = document.getElementById("audioPlayPause"); const t = document.getElementById("trackName"); if (b) b.innerHTML = p ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'; if (t && n) t.textContent = n.replace(/_/g, " ").replace(/\.[^/.]+$/, ""); }

    // =================================================================
    // MENÚS Y LISTAS
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
        herramientasExternas.forEach(t => {
            const div = document.createElement("div"); div.className = "tool-card";
            div.innerHTML = `<div class="tool-header"><i class="${t.icono}"></i> ${t.nombre}</div><div class="tool-desc">${t.descripcion}</div><a href="${t.url}" target="_blank" rel="noopener noreferrer" class="tool-btn">Abrir <i class="fas fa-external-link-alt"></i></a>`;
            c.appendChild(div);
        });
    }

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
        Object.values(mensajesData).forEach(msg => { if (msg.categoria) categories.add(msg.categoria); });
        const cur = this.elements.categoryFilter.value;
        this.elements.categoryFilter.innerHTML = '<option value="">Todas</option>';
        categories.forEach(cat => { const o = document.createElement("option"); o.value = cat; o.textContent = cat; if (cat === cur) o.selected = true; this.elements.categoryFilter.appendChild(o); });
        this.triggerListFilter();
    }

    triggerListFilter() {
        if (!this.currentData) return;
        const { unlockedSet, favoritesSet, mensajesData } = this.currentData;
        const s = normalizeText(this.elements.searchUnlocked.value);
        const cat = this.elements.categoryFilter.value;
        this.elements.unlockedList.innerHTML = "";
        
        const allCodes = Object.keys(mensajesData).sort();
        let visibleCount = 0;

        allCodes.forEach(code => {
            const data = mensajesData[code];
            const isUnlocked = unlockedSet.has(code);

            if (this.showingFavoritesOnly && !favoritesSet.has(code)) return;
            if (s && isUnlocked && !normalizeText(code).includes(s)) return;
            if (cat && data.categoria !== cat) return;

            visibleCount++;
            const li = document.createElement("li");
            
            if (isUnlocked) {
                li.className = "lista-codigo-item";
                li.innerHTML = `<div style="flex-grow:1"><span class="codigo-text">${code}</span><span class="category">${data.categoria}</span></div>`;
                const favBtn = document.createElement("button"); favBtn.className = `favorite-toggle-btn ${favoritesSet.has(code) ? 'active' : ''}`; favBtn.innerHTML = `<i class="${favoritesSet.has(code) ? 'fas' : 'far'} fa-heart"></i>`;
                favBtn.onclick = (e) => { e.stopPropagation(); if (this.onToggleFavorite) this.onToggleFavorite(code); };
                li.onclick = () => { if (this.onCodeSelected) this.onCodeSelected(code); this.elements.contentDiv.scrollIntoView({ behavior: 'smooth' }); };
                li.appendChild(favBtn);
            } else {
                li.className = "lista-codigo-item locked";
                li.innerHTML = `<div style="flex-grow:1; display:flex; align-items:center;"><i class="fas fa-lock lock-icon"></i><div><span class="codigo-text">??????</span><span class="category" style="opacity:0.5">${data.categoria || 'Secreto'}</span></div></div>`;
                li.onclick = () => this.showToast("🔒 ¡Sigue buscando para desbloquear este secreto!");
            }
            this.elements.unlockedList.appendChild(li);
        });
        if (visibleCount === 0) this.elements.unlockedList.innerHTML = '<p style="text-align:center; width:100%; opacity:0.7">Sin resultados.</p>';
    }

    exportProgress() { const d = { unlocked: JSON.parse(localStorage.getItem("desbloqueados")||"[]"), favorites: JSON.parse(localStorage.getItem("favoritos")||"[]"), achievements: JSON.parse(localStorage.getItem("logrosAlcanzados")||"[]"), timestamp: new Date().toISOString() }; const b = new Blob([JSON.stringify(d,null,2)],{type:"application/json"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download=`progreso_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(u); this.showToast("Progreso exportado correctamente"); }
    handleImportFile(f) { const r = new FileReader(); r.onload=(e)=>{try{const d=JSON.parse(e.target.result);if(this.onImportData)this.onImportData(d);}catch(err){this.showToast("Error: El archivo no es válido");}}; r.readAsText(f); }
}
