/**
 * modules/gameEngine.js
 * Lógica de negocio del juego.
 */
import { mensajes, logros } from './data.js';
import { normalizeText, hashString, levenshtein } from './utils.js';

export class GameEngine {
    constructor(uiManager, audioManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        
        this.unlocked = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
        this.achievedLogros = new Set(JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"));
        
        this.init();
    }

    init() {
        this.updateProgress();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const btn = document.getElementById("submitCodeBtn");
        const input = document.getElementById("codeInput");

        btn.addEventListener("click", () => this.handleInput());
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.handleInput();
            }
        });
    }

    async handleInput() {
        const inputRaw = this.ui.elements.input.value;
        if (!inputRaw) return;

        const normalizedInput = normalizeText(inputRaw);
        
        // 1. Verificación Directa (Para compatibilidad con tu data.js actual)
        // En el futuro, aquí usaremos: const inputHash = await hashString(normalizedInput);
        let foundKey = null;

        // Búsqueda exacta
        if (mensajes[normalizedInput]) {
            foundKey = normalizedInput;
        }

        if (foundKey) {
            this.unlockCode(foundKey);
        } else {
            // Verificación de "Cercanía" (Levenshtein)
            this.checkCloseMatch(normalizedInput);
        }
    }

    unlockCode(key) {
        const data = mensajes[key];
        
        this.ui.showSuccess();
        this.audio.playCorrect();
        this.ui.renderContent(data);
        this.ui.clearInput();

        if (!this.unlocked.has(key)) {
            this.unlocked.add(key);
            this.saveProgress();
            this.checkLogros();
            this.ui.showToast(`¡Código desbloqueado!`);
        }
    }

    checkCloseMatch(input) {
        let closest = null;
        let minDistance = 3; // Tolerancia

        for (const key of Object.keys(mensajes)) {
            const dist = levenshtein(input, normalizeText(key));
            if (dist < minDistance) {
                closest = key;
                minDistance = dist;
            }
        }

        if (closest) {
            this.ui.showError(); // Visual shake
            // Opcional: Mostrar pista en UI "Estás cerca..."
            console.log("Cerca de:", closest);
        } else {
            this.ui.showError();
            this.audio.playIncorrect();
        }
    }

    checkLogros() {
        const count = this.unlocked.size;
        
        logros.forEach(logro => {
            if (!this.achievedLogros.has(logro.id) && count >= logro.codigo_requerido) {
                this.achievedLogros.add(logro.id);
                this.ui.showToast(`🏆 Logro: ${logro.mensaje}`);
                // Guardar logros
                localStorage.setItem("logrosAlcanzados", JSON.stringify([...this.achievedLogros]));
            }
        });
    }

    updateProgress() {
        this.ui.updateProgress(this.unlocked.size, Object.keys(mensajes).length);
    }

    saveProgress() {
        localStorage.setItem("desbloqueados", JSON.stringify([...this.unlocked]));
        this.updateProgress();
    }
}
