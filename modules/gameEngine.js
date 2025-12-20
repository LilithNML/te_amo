/**
 * modules/GameEngine.js
 * Lógica central del juego: Manejo de códigos, pistas y estado de desbloqueo.
 */

import { mensajes } from './data.js';
import { normalizeText } from './utils.js';

export class GameEngine {
    constructor(uiManager, audioManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        this.mensajes = mensajes; // Base de datos de códigos

        // Estado del jugador
        this.unlockedSet = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
        this.favoritesSet = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));

        // Referencias a botones de acción
        this.checkBtn = document.getElementById("checkBtn");
        this.hintBtn = document.getElementById("hintBtn"); // Botón de Pista Nuevo

        this.init();
    }

    init() {
        // 1. Configurar Listeners Principales
        if (this.checkBtn) {
            this.checkBtn.addEventListener("click", () => this.handleCode());
        }

        if (this.hintBtn) {
            this.hintBtn.addEventListener("click", () => this.giveHint());
        }

        // Permitir "Enter" en el input
        if (this.ui.elements.input) {
            this.ui.elements.input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") this.handleCode();
            });
        }

        // 2. Configurar Callbacks de la UI (Para cuando el usuario interactúa con la lista)
        this.ui.onCodeSelected = (code) => {
            const data = this.mensajes[code];
            if (data) {
                this.ui.renderContent(data, code);
                if (data.audio) this.audio.playTrack(data.audio);
            }
        };

        this.ui.onToggleFavorite = (code) => this.toggleFavorite(code);
        
        // Manejar importación de datos externos
        this.ui.onImportData = (data) => {
            if (data.unlocked && Array.isArray(data.unlocked)) {
                this.unlockedSet = new Set(data.unlocked);
                this.favoritesSet = new Set(data.favorites || []);
                this.saveProgress();
                this.ui.showToast("Progreso cargado exitosamente");
                location.reload(); // Recargar para ver cambios
            }
        };

        // 3. Renderizado Inicial
        this.updateUI();
    }

    /**
     * Procesa el código ingresado por el usuario.
     */
    handleCode() {
        const input = this.ui.elements.input;
        const rawCode = input.value;
        const code = normalizeText(rawCode);

        if (!code) return;

        // Buscar en la base de datos
        if (this.mensajes.hasOwnProperty(code)) {
            // ¡CÓDIGO ENCONTRADO!
            const data = this.mensajes[code];
            
            // 1. Desbloquear
            if (!this.unlockedSet.has(code)) {
                this.unlockedSet.add(code);
                this.saveProgress();
                this.ui.showToast("¡Nuevo secreto desbloqueado!");
                this.ui.triggerConfetti();
            }

            // 2. Renderizar contenido
            this.ui.renderContent(data, rawCode); // Usamos rawCode para mantener mayúsculas originales en título
            this.ui.showSuccess();

            // 3. Reproducir audio asociado (si tiene)
            if (data.audio) {
                this.audio.playTrack(data.audio);
            }

            // 4. Actualizar lista visual
            this.updateUI();
            this.ui.dismissKeyboard();

        } else {
            // CÓDIGO INCORRECTO
            this.ui.showError();
            this.ui.showToast("Código incorrecto o no existe.");
        }
        
        // Limpiar input
        this.ui.clearInput();
    }

    /**
     * Sistema de Pistas: Busca un código no descubierto y da una pista.
     */
    giveHint() {
        // 1. Obtener todos los códigos posibles
        const allCodes = Object.keys(this.mensajes);
        
        // 2. Filtrar los que NO están desbloqueados
        const lockedCodes = allCodes.filter(code => !this.unlockedSet.has(code));

        if (lockedCodes.length === 0) {
            this.ui.showToast("🎉 ¡Increíble! Ya has descubierto todo.");
            this.ui.triggerConfetti();
            return;
        }

        // 3. Elegir uno al azar
        const randomCode = lockedCodes[Math.floor(Math.random() * lockedCodes.length)];
        const data = this.mensajes[randomCode];

        // 4. Obtener texto de pista
        const pistaTexto = data.pista && data.pista.trim() !== "" 
            ? data.pista 
            : `El código empieza con: ${randomCode.charAt(0).toUpperCase()}...`;

        // 5. Mostrar
        this.ui.showToast(`Pista: ${pistaTexto}`);
        
        // Animación sutil para indicar dónde escribir
        const input = this.ui.elements.input;
        input.focus();
        input.classList.add("shake");
        setTimeout(() => input.classList.remove("shake"), 500);
    }

    /**
     * Alterna el estado de favorito de un código.
     */
    toggleFavorite(code) {
        if (this.favoritesSet.has(code)) {
            this.favoritesSet.delete(code);
        } else {
            this.favoritesSet.add(code);
        }
        this.saveProgress();
        this.updateUI(); // Refrescar la lista para actualizar el icono
    }

    /**
     * Guarda el estado actual en localStorage.
     */
    saveProgress() {
        localStorage.setItem("desbloqueados", JSON.stringify([...this.unlockedSet]));
        localStorage.setItem("favoritos", JSON.stringify([...this.favoritesSet]));
    }

    /**
     * Actualiza la lista lateral y la barra de progreso.
     */
    updateUI() {
        this.ui.updateProgress(this.unlockedSet.size, Object.keys(this.mensajes).length);
        this.ui.renderUnlockedList(this.unlockedSet, this.favoritesSet, this.mensajes);
    }
}
