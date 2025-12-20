/**
 * main.js
 * Punto de entrada principal.
 */
import { UIManager } from './modules/uiManager.js';
import { AudioManager } from './modules/audioManager.js';
import { GameEngine } from './modules/gameEngine.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar Sistemas de Interfaz y Audio
    const ui = new UIManager();
    const audio = new AudioManager(ui);

    // 2. Inicializar Motor del Juego
    const game = new GameEngine(ui, audio);
});
