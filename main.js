/**
 * main.js
 * Punto de entrada de la aplicación.
 */
import { UIManager } from './modules/uiManager.js';
import { AudioManager } from './modules/audioManager.js';
import { GameEngine } from './modules/gameEngine.js';

// Inicialización segura cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
    console.log("Iniciando Un Secreto Para Ti v2.0...");

    const ui = new UIManager();
    const audio = new AudioManager();
    const game = new GameEngine(ui, audio);

    // Exponer para debugging (opcional, quitar en producción real)
    window.__game = game;
});
