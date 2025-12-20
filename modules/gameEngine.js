/**
 * modules/GameEngine.js
 * Lógica del juego: Validación de códigos, pistas y gestión de estado.
 */

import { mensajes } from './data.js';
// Asumimos que utils.js ya tiene estas funciones (como mencionaste)
import { normalizeText, levenshteinDistance } from './utils.js';

export class GameEngine {
    constructor(uiManager, audioManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        this.mensajes = mensajes; 

        // Estado
        this.unlockedSet = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
        this.favoritesSet = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));
        
        // Contador de errores para pistas automáticas (Restaurado)
        this.errorCount = 0;

        // Referencias botones
        this.checkBtn = document.getElementById("checkBtn");
        this.hintBtn = document.getElementById("hintBtn"); // Botón nuevo

        this.init();
    }

    init() {
        // Listeners
        if (this.checkBtn) {
            this.checkBtn.addEventListener("click", () => this.handleCode());
        }

        // Listener del Botón de Pista Manual
        if (this.hintBtn) {
            this.hintBtn.addEventListener("click", () => this.giveHint(true)); // true = forzado por botón
        }

        // Enter en el input
        if (this.ui.elements.input) {
            this.ui.elements.input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") this.handleCode();
                // Limpiar feedback al escribir de nuevo
                if (this.ui.elements.feedback && this.ui.elements.feedback.textContent !== "") {
                    this.ui.clearFeedback();
                }
            });
        }

        // Callbacks UI
        this.ui.onCodeSelected = (code) => {
            const data = this.mensajes[code];
            if (data) {
                this.ui.renderContent(data, code);
                if (data.audio) this.audio.playTrack(data.audio);
            }
        };

        this.ui.onToggleFavorite = (code) => this.toggleFavorite(code);
        
        this.ui.onImportData = (data) => {
            if (data.unlocked) {
                this.unlockedSet = new Set(data.unlocked);
                this.favoritesSet = new Set(data.favorites || []);
                this.saveProgress();
                this.ui.showToast("Progreso cargado");
                location.reload();
            }
        };

        this.updateUI();
    }

    /**
     * Procesa el código ingresado.
     */
    handleCode() {
        const input = this.ui.elements.input;
        const rawCode = input.value;
        const code = normalizeText(rawCode);

        if (!code) return;

        // 1. COINCIDENCIA EXACTA
        if (this.mensajes.hasOwnProperty(code)) {
            this.unlockContent(code, rawCode);
            this.errorCount = 0; // Reiniciar contador
            return;
        } 

        // 2. BÚSQUEDA APROXIMADA (Restaurada)
        const closest = this.findBestMatch(code);

        if (closest) {
            // "Quizás quisiste decir..."
            this.ui.showFeedback(`¿Quisiste decir "${closest}"?`, 'suggestion');
            this.ui.showError(); // Agita input
            this.errorCount++;
        } else {
            // 3. FALLO
            this.ui.showFeedback("Código incorrecto.", 'error');
            this.ui.showError();
            this.errorCount++;
        }

        // 4. PISTA AUTOMÁTICA (5 errores)
        if (this.errorCount >= 5) {
            this.giveHint(false); // false = automática
            this.errorCount = 0;
        }
    }

    /**
     * Lógica de desbloqueo exitoso
     */
    unlockContent(code, displayTitle) {
        const data = this.mensajes[code];
        
        if (!this.unlockedSet.has(code)) {
            this.unlockedSet.add(code);
            this.saveProgress();
            this.ui.showToast("¡Nuevo secreto desbloqueado!");
            this.ui.triggerConfetti();
        }

        this.ui.renderContent(data, displayTitle);
        this.ui.showSuccess();
        
        // Importante: Limpiar feedback anterior
        if(this.ui.clearFeedback) this.ui.clearFeedback();

        if (data.audio) this.audio.playTrack(data.audio);

        this.updateUI();
        this.ui.dismissKeyboard();
        this.ui.elements.input.value = "";
    }

    /**
     * Busca la clave más cercana (Levenshtein)
     */
    findBestMatch(inputCode) {
        const keys = Object.keys(this.mensajes);
        let bestMatch = null;
        let minDistance = Infinity;
        // Umbral: palabras cortas (<5) toleran 1 error, largas 2.
        const threshold = inputCode.length < 5 ? 1 : 2;

        keys.forEach(key => {
            const dist = levenshteinDistance(inputCode, key);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = key;
            }
        });

        if (minDistance <= threshold) {
            return bestMatch;
        }
        return null;
    }

    /**
     * Muestra una pista en el área de feedback.
     * @param {boolean} manual - Si fue invocado por el botón (true) o por errores (false)
     */
    giveHint(manual = false) {
        const allCodes = Object.keys(this.mensajes);
        const lockedCodes = allCodes.filter(code => !this.unlockedSet.has(code));

        if (lockedCodes.length === 0) {
            if (manual) this.ui.showToast("🎉 ¡Ya has descubierto todo!");
            return;
        }

        // Elegir código al azar
        const randomCode = lockedCodes[Math.floor(Math.random() * lockedCodes.length)];
        const data = this.mensajes[randomCode];

        // Obtener texto de pista (de data.js) o generar genérica
        const pistaTexto = data.pista && data.pista.trim() !== "" 
            ? data.pista 
            : `Intenta buscar: ${randomCode.charAt(0).toUpperCase()}...`;

        // Mostrar en el área de feedback (Debajo del input)
        this.ui.showFeedback(`💡 Pista: ${pistaTexto}`, 'hint');
        
        if (manual) {
            this.ui.elements.input.focus();
        }
    }

    toggleFavorite(code) {
        if (this.favoritesSet.has(code)) {
            this.favoritesSet.delete(code);
        } else {
            this.favoritesSet.add(code);
        }
        this.saveProgress();
        this.updateUI();
    }

    saveProgress() {
        localStorage.setItem("desbloqueados", JSON.stringify([...this.unlockedSet]));
        localStorage.setItem("favoritos", JSON.stringify([...this.favoritesSet]));
    }

    updateUI() {
        this.ui.updateProgress(this.unlockedSet.size, Object.keys(this.mensajes).length);
        this.ui.renderUnlockedList(this.unlockedSet, this.favoritesSet, this.mensajes);
    }
}
