/**
 * modules/uiManager.js
 */
import { normalizeText } from './utils.js';

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
            modalCaption: document.getElementById("modalCaption"),
            
            // Menu
            menuButton: document.getElementById("menuButton"),
            dropdownMenu: document.getElementById("dropdownMenu"),
            importInput: document.getElementById("importInput"),
            
            // Audio Panel
            audioPanel: document.getElementById("audioPanel"),
            closeAudioPanel: document.getElementById("closeAudioPanel"),
            
            // Unlocked Section
            unlockedSection: document.getElementById("unlockedSection"),
            unlockedList: document.getElementById("unlockedList"),
            searchUnlocked: document.getElementById("searchUnlocked"),
            categoryFilter: document.getElementById("categoryFilter"),
            filterFavBtn: document.getElementById("filterFavBtn"),
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn")
        };

        this.showingFavoritesOnly = false;
        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
    }

    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") document.body.classList.add("dark-mode");
    }

    toggleDarkMode() {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        this.showToast(isDark ? "Modo Oscuro" : "Modo Claro");
    }

    setupMenuListeners() {
        // Toggle
        this.elements.menuButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.elements.dropdownMenu.classList.toggle("show");
        });
        document.addEventListener("click", (e) => {
            if (!this.elements.menuButton.contains(e.target) && !this.elements.dropdownMenu.contains(e.target)) {
                this.elements.dropdownMenu.classList.remove("show");
            }
        });

        // Actions
        this.bindAction("menuHome", () => {
            this.toggleUnlockedPanel(false);
            window.scrollTo({top:0, behavior:'smooth'});
        });
        this.bindAction("menuShowUnlocked", () => this.toggleUnlockedPanel(true));
        this.bindAction("menuFavorites", () => {
            this.toggleUnlockedPanel(true);
            this.showingFavoritesOnly = true;
            this.updateFilterUI();
            this.triggerListFilter();
        });
        this.bindAction("menuDarkMode", () => this.toggleDarkMode());
        this.bindAction("menuAudio", () => {
            this.elements.audioPanel.classList.add("show");
            this.elements.audioPanel.setAttribute("aria-hidden", "false");
        });
        this.elements.closeAudioPanel.addEventListener("click", () => {
             this.elements.audioPanel.classList.remove("show");
             this.elements.audioPanel.setAttribute("aria-hidden", "true");
        });

        // Import/Export
        this.bindAction("menuExport", () => this.exportProgress());
        this.bindAction("menuImport", () => this.elements.importInput.click());
        
        this.elements.importInput.addEventListener("change", (e) => {
            if(e.target.files.length > 0) this.handleImportFile(e.target.files[0]);
            this.elements.importInput.value = "";
        });
    }

    bindAction(id, fn) {
        const el = document.getElementById(id);
        if(el) el.addEventListener("click", () => { fn(); this.elements.dropdownMenu.classList.remove("show"); });
    }

    // --- IMPORT / EXPORT LOGIC ---
    exportProgress() {
        const data = {
            unlocked: JSON.parse(localStorage.getItem("desbloqueados")||"[]"),
            favorites: JSON.parse(localStorage.getItem("favoritos")||"[]"),
            achievements: JSON.parse(localStorage.getItem("logrosAlcanzados")||"[]"),
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `progreso_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("Progreso exportado");
    }

    handleImportFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if(this.onImportData) this.onImportData(data);
            } catch(err) { this.showToast("Archivo inválido"); }
        };
        reader.readAsText(file);
    }

    // --- LIST & FILTER ---
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
        if(show) this.elements.unlockedSection.scrollIntoView({behavior:'smooth'});
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
        
        // Populate Categories
        const categories = new Set();
        unlockedSet.forEach(code => {
             if(mensajesData[code]) categories.add(mensajesData[code].categoria);
        });
        const currentCat = this.elements.categoryFilter.value;
        this.elements.categoryFilter.innerHTML = '<option value="">Todas</option>';
        categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat; opt.textContent = cat;
            if(cat === currentCat) opt.selected = true;
            this.elements.categoryFilter.appendChild(opt);
        });

        this.triggerListFilter();
    }

    triggerListFilter() {
        if(!this.currentData) return;
        const { unlockedSet, favoritesSet, mensajesData } = this.currentData;
        const search = normalizeText(this.elements.searchUnlocked.value);
        const cat = this.elements.categoryFilter.value;

        this.elements.unlockedList.innerHTML = "";
        
        Array.from(unlockedSet).sort().forEach(code => {
            const data = mensajesData[code];
            if(!data) return;
            // Filtros
            if(this.showingFavoritesOnly && !favoritesSet.has(code)) return;
            if(search && !normalizeText(code).includes(search)) return;
            if(cat && data.categoria !== cat) return;

            // Render Item
            const li = document.createElement("li");
            li.className = "lista-codigo-item";
            li.innerHTML = `<div style="flex-grow:1"><span class="codigo-text">${code}</span><span class="category">${data.categoria}</span></div>`;
            
            const favBtn = document.createElement("button");
            favBtn.className = `favorite-toggle-btn ${favoritesSet.has(code) ? 'active' : ''}`;
            favBtn.innerHTML = `<i class="${favoritesSet.has(code) ? 'fas' : 'far'} fa-heart"></i>`;
            favBtn.onclick = (e) => { e.stopPropagation(); if(this.onToggleFavorite) this.onToggleFavorite(code); };

            li.onclick = () => {
                if(this.onCodeSelected) this.onCodeSelected(code);
                this.elements.contentDiv.scrollIntoView({behavior:'smooth'});
            };
            li.appendChild(favBtn);
            this.elements.unlockedList.appendChild(li);
        });
        
        if(this.elements.unlockedList.children.length === 0) {
            this.elements.unlockedList.innerHTML = '<p style="text-align:center;width:100%;opacity:0.7">Sin resultados.</p>';
        }
    }

    // --- CONTENT RENDERING ---
    renderContent(data, key) {
        const c = this.elements.contentDiv;
        c.hidden = false; c.innerHTML = "";
        
        const h2 = document.createElement("h2");
        h2.textContent = key ? `Código: ${key}` : "¡Desbloqueado!";
        h2.style.textTransform = "capitalize";
        c.appendChild(h2);

        if(data.texto && data.type !== 'text') {
            const p = document.createElement("p");
            p.textContent = data.texto;
            c.appendChild(p);
        }

        switch(data.type) {
            case "text":
                const pt = document.createElement("p"); pt.className = "mensaje-texto"; pt.textContent = data.texto;
                c.appendChild(pt); break;
            case "image":
                const img = document.createElement("img"); img.src = data.imagen; img.alt = data.texto;
                img.style.cursor = "pointer";
                img.onclick = () => this.openModal(data.imagen, data.texto);
                c.appendChild(img); break;
            case "video":
                if(data.videoEmbed) {
                    const ifr = document.createElement("iframe"); ifr.src = data.videoEmbed; ifr.className="video-frame";
                    c.appendChild(ifr);
                } break;
            case "link":
                const a = document.createElement("a"); a.href = data.link; a.target="_blank"; a.className="button"; a.textContent="Abrir Enlace";
                c.appendChild(a); break;
            case "download":
                const d = document.createElement("a"); d.href = data.descarga.url; d.download = data.descarga.nombre; d.className="button";
                d.innerHTML='<i class="fas fa-download"></i> Descargar'; c.appendChild(d); break;
        }
        c.classList.remove("fade-in"); void c.offsetWidth; c.classList.add("fade-in");
    }

    renderMessage(title, htmlBody) {
        const c = this.elements.contentDiv;
        c.hidden = false; c.innerHTML = `<h2>${title}</h2><p>${htmlBody}</p>`;
        c.classList.remove("fade-in"); void c.offsetWidth; c.classList.add("fade-in");
    }

    // --- UI HELPERS ---
    showError() {
        this.elements.input.classList.add("shake", "error");
        setTimeout(() => this.elements.input.classList.remove("shake"), 500);
    }
    showSuccess() {
        this.elements.input.classList.remove("error");
        this.elements.input.classList.add("success");
    }
    clearInput() { this.elements.input.value = ""; this.elements.input.focus(); }
    
    updateProgress(u, t) {
        const p = t>0 ? Math.round((u/t)*100) : 0;
        this.elements.progressBar.style.width = `${p}%`;
        this.elements.progressText.textContent = `Descubiertos: ${u} / ${t}`;
    }
    
    showToast(msg) {
        const t = document.createElement("div"); t.className = "achievement-toast"; t.textContent = msg;
        this.elements.toastContainer.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }
    
    openModal(src, txt) {
        this.elements.modalImg.src = src;
        this.elements.modalCaption.textContent = txt || "";
        this.elements.modal.style.display = "flex";
    }

    updateAudioUI(isPlaying, name) {
        const btn = document.getElementById("audioPlayPause");
        const txt = document.getElementById("trackName");
        if(btn) btn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        if(txt && name) txt.textContent = name.replace(/_/g, " ").replace(".mp3", "");
    }
}
