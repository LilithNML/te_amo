/**
 * modules/gameEngine.js
 */
import { mensajes, logros } from './data.js';
import { normalizeText, levenshtein } from './utils.js';

export class GameEngine {
    constructor(uiManager, audioManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        
        this.unlocked = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
        this.favorites = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));
        this.achievedLogros = new Set(JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"));
        
        this.failedAttempts = parseInt(localStorage.getItem("failedAttempts") || "0");
        this.MAX_FAILED_ATTEMPTS = 5;

        this.init();
    }

    init() {
        this.updateProgress();
        this.setupEventListeners();
        
        // Callbacks
        this.ui.onToggleFavorite = (code) => this.toggleFavorite(code);
        this.ui.onCodeSelected = (code) => this.unlockCode(code, false);
        this.ui.onImportData = (data) => this.importProgress(data);
        
        // Initial render
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    setupEventListeners() {
        const btn = document.getElementById("submitCodeBtn");
        const input = document.getElementById("codeInput");
        const resetBtn = document.getElementById("menuReset");

        btn.addEventListener("click", () => this.handleInput());
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); this.handleInput(); }
        });
        if(resetBtn) resetBtn.addEventListener("click", () => this.resetProgress());
    }

    handleInput() {
        const inputRaw = this.ui.elements.input.value;
        if (!inputRaw) return;
        const normalizedInput = normalizeText(inputRaw);
        
        // Coincidencia exacta
        let foundKey = Object.keys(mensajes).find(k => normalizeText(k) === normalizedInput);

        if (foundKey) {
            this.unlockCode(foundKey, true);
            this.resetFailedAttempts();
        } else {
            this.handleIncorrectInput(normalizedInput);
        }
    }

    handleIncorrectInput(normalizedInput) {
        this.audio.playIncorrect();
        this.ui.showError();
        
        this.failedAttempts++;
        localStorage.setItem("failedAttempts", this.failedAttempts);

        // Casi lo tienes (Levenshtein)
        let closest = null, minDist = 3;
        for (const key of Object.keys(mensajes)) {
            const dist = levenshtein(normalizedInput, normalizeText(key));
            if (dist < minDist || normalizeText(key).includes(normalizedInput)) {
                closest = key; minDist = dist;
            }
        }

        if (closest) {
             this.ui.renderMessage("Vas muy bien...", `Parece que intentas escribir <strong>"${closest}"</strong>. ¡Revisa!`);
             return;
        }

        // Sistema de Pistas
        if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
            this.giveHint();
            this.resetFailedAttempts();
        } else {
            this.ui.renderMessage("Código Incorrecto", `Intento ${this.failedAttempts} de ${this.MAX_FAILED_ATTEMPTS} para obtener una pista.`);
        }
    }

    giveHint() {
        const locked = Object.keys(mensajes).filter(k => !this.unlocked.has(k) && mensajes[k].pista);
        if (locked.length > 0) {
            const random = locked[Math.floor(Math.random() * locked.length)];
            this.ui.renderMessage("¡Una Pista!", `Busca sobre: <em>"${mensajes[random].pista}"</em>`);
        } else {
            this.ui.renderMessage("¡Vaya!", "Ya casi has descubierto todo.");
        }
    }

    unlockCode(key, isNew) {
        if (isNew) {
            this.ui.showSuccess();
            this.audio.playCorrect();
            if (!this.unlocked.has(key)) {
                this.unlocked.add(key);
                this.saveProgress();
                this.checkLogros();
                this.ui.showToast(`¡Descubierto: ${key}!`);
            }
        }
        this.ui.renderContent(mensajes[key], key);
        this.ui.clearInput();
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    toggleFavorite(code) {
        if (this.favorites.has(code)) this.favorites.delete(code);
        else this.favorites.add(code);
        
        localStorage.setItem("favoritos", JSON.stringify([...this.favorites]));
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    checkLogros() {
        const c = this.unlocked.size;
        logros.forEach(l => {
            if (!this.achievedLogros.has(l.id) && c >= l.codigo_requerido) {
                this.achievedLogros.add(l.id);
                this.ui.showToast(`🏆 Logro: ${l.mensaje}`);
                localStorage.setItem("logrosAlcanzados", JSON.stringify([...this.achievedLogros]));
            }
        });
    }

    updateProgress() { this.ui.updateProgress(this.unlocked.size, Object.keys(mensajes).length); }
    saveProgress() { localStorage.setItem("desbloqueados", JSON.stringify([...this.unlocked])); this.updateProgress(); }
    resetFailedAttempts() { this.failedAttempts = 0; localStorage.setItem("failedAttempts", "0"); }
    
    importProgress(data) {
        if(!data.unlocked) { this.ui.showToast("Datos inválidos"); return; }
        this.unlocked = new Set(data.unlocked);
        this.favorites = new Set(data.favorites || []);
        this.achievedLogros = new Set(data.achievements || []);
        this.saveProgress();
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
        this.ui.showToast("Progreso importado");
    }

    resetProgress() {
        if(confirm("¿Borrar todo el progreso?")) {
            localStorage.clear();
            location.reload();
        }
    }
}
