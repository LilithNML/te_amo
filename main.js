/**
 * main.js
 * Punto de entrada principal.
 */
import { UIManager } from './modules/uiManager.js';
import { AudioManager } from './modules/audioManager.js';
import { GameEngine } from './modules/gameEngine.js';

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar Sistemas
    const ui = new UIManager();
    const audio = new AudioManager(ui);
    const game = new GameEngine(ui, audio);
});
