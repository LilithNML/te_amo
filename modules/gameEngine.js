/**
 * modules/gameEngine.js
 * Actualizado con Haptic Feedback y llamadas a Confeti
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
        this.hintBtn = document.getElementById("hintBtn");
    if (this.hintBtn) {
        this.hintBtn.addEventListener("click", () => this.giveHint());
}
    }

    init() {
        this.updateProgress();
        this.setupEventListeners();
        this.ui.onToggleFavorite = (code) => this.toggleFavorite(code);
        this.ui.onCodeSelected = (code) => this.unlockCode(code, false);
        this.ui.onImportData = (data) => this.importProgress(data);
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    setupEventListeners() {
        const btn = document.getElementById("submitCodeBtn");
        const input = document.getElementById("codeInput");
        const resetBtn = document.getElementById("menuReset");
        if (btn) btn.addEventListener("click", () => this.handleInput());
        if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); this.handleInput(); } });
        if (resetBtn) resetBtn.addEventListener("click", () => this.resetProgress());
    }

    handleInput() {
        const inputRaw = this.ui.elements.input.value;
        if (!inputRaw || inputRaw.trim() === "") return;
        this.ui.dismissKeyboard(); // Cerrar teclado
        const normalizedInput = normalizeText(inputRaw);
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
        
        // HAPTIC FEEDBACK: Doble vibración corta para error
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

        this.failedAttempts++;
        localStorage.setItem("failedAttempts", this.failedAttempts.toString());

        let closest = null, minDist = 3;
        for (const key of Object.keys(mensajes)) {
            const normalizedKey = normalizeText(key);
            const dist = levenshtein(normalizedInput, normalizedKey);
            if (dist < minDist || normalizedKey.includes(normalizedInput)) { closest = key; minDist = dist; }
        }

        if (closest) {
             this.ui.renderMessage("Vas muy bien...", `Parece que intentas escribir <strong>"${closest}"</strong>. ¡Revisa!`);
             return;
        }

        if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
            this.giveHint();
            this.resetFailedAttempts();
        } else {
            this.ui.renderMessage("Código Incorrecto", `Intento ${this.failedAttempts} de ${this.MAX_FAILED_ATTEMPTS} para recibir una ayuda.`);
        }
    }

    giveHint() {
        const lockedCandidates = Object.keys(mensajes).filter(k => !this.unlocked.has(k) && mensajes[k].pista);
        if (lockedCandidates.length > 0) {
            const randomCode = lockedCandidates[Math.floor(Math.random() * lockedCandidates.length)];
            this.ui.renderMessage("¡Una Pista para ti!", `Prueba buscando sobre: <em>"${mensajes[randomCode].pista}"</em>`);
        } else {
            this.ui.renderMessage("¡Vaya!", "Ya has descubierto casi todo, no quedan pistas disponibles.");
        }
    }

    unlockCode(key, isNewDiscovery) {
        const data = mensajes[key];
        
        if (isNewDiscovery) {
            this.ui.showSuccess();
            this.audio.playCorrect();
            
            // HAPTIC FEEDBACK: Vibración larga y suave para éxito
            if (navigator.vibrate) navigator.vibrate(200);

            // EFECTO CONFETI: Celebración
            this.ui.triggerConfetti();

            if (!this.unlocked.has(key)) {
                this.unlocked.add(key);
                this.saveProgress();
                this.checkLogros();
                this.ui.showToast(`¡Nuevo descubrimiento: ${key}!`);
            }
        }

        this.ui.renderContent(data, key);
        this.ui.clearInput();
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    // ... (Métodos toggleFavorite, checkLogros, updateProgress, saveProgress, resetFailedAttempts, importProgress, resetProgress SIN CAMBIOS) ...
    // Para brevedad, asegúrate de mantener el resto del archivo igual que antes.
    toggleFavorite(code) { if (this.favorites.has(code)) this.favorites.delete(code); else this.favorites.add(code); localStorage.setItem("favoritos", JSON.stringify([...this.favorites])); this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes); }
    checkLogros() { const c = this.unlocked.size; logros.forEach(l => { if (!this.achievedLogros.has(l.id) && c >= l.codigo_requerido) { this.achievedLogros.add(l.id); this.ui.showToast(`🏆 Logro: ${l.mensaje}`); localStorage.setItem("logrosAlcanzados", JSON.stringify([...this.achievedLogros])); } }); }
    updateProgress() { this.ui.updateProgress(this.unlocked.size, Object.keys(mensajes).length); }
    saveProgress() { localStorage.setItem("desbloqueados", JSON.stringify([...this.unlocked])); this.updateProgress(); }
    resetFailedAttempts() { this.failedAttempts = 0; localStorage.setItem("failedAttempts", "0"); }
    importProgress(data) { if (!data.unlocked || !Array.isArray(data.unlocked)) { this.ui.showToast("Error: Archivo incompatible"); return; } this.unlocked = new Set(data.unlocked); this.favorites = new Set(data.favorites || []); this.achievedLogros = new Set(data.achievements || []); this.saveProgress(); this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes); this.ui.showToast("¡Progreso recuperado!"); }
    resetProgress() { if (confirm("¿Borrar todo?")) { localStorage.clear(); location.reload(); } }

    /**
     * Busca un código bloqueado al azar y muestra su pista.
     */
    giveHint() {
        // 1. Obtener todos los códigos posibles de la data
        const allCodes = Object.keys(this.mensajes);
        
        // 2. Filtrar solo los que NO han sido descubiertos
        // (this.unlockedSet debe ser el Set donde guardas los descubiertos)
        const lockedCodes = allCodes.filter(code => !this.unlockedSet.has(code));

        if (lockedCodes.length === 0) {
            this.ui.showToast("🎉 ¡Eres increíble! Ya has descubierto todos los secretos.");
            this.ui.triggerConfetti();
            return;
        }

        // 3. Elegir uno al azar
        const randomCode = lockedCodes[Math.floor(Math.random() * lockedCodes.length)];
        const data = this.mensajes[randomCode];

        // 4. Obtener la pista (o un mensaje por defecto si no tiene)
        const pistaTexto = data.pista && data.pista.trim() !== "" 
            ? data.pista 
            : "Sigue buscando... este secreto es muy misterioso.";

        // 5. Mostrar la pista en pantalla
        // Usamos showToast para que sea sutil, o puedes usar renderMessage si quieres un modal
        this.ui.renderMessage(`💡 Pista: ${pistaTexto}`);
        
        // Opcional: Agrega una pequeña animación al input para llamar la atención
        const input = this.ui.elements.input;
        input.focus();
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 500);
    }
    
}
