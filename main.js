/**
 * main.js
 * Punto de entrada principal con carga de base de datos JSON.
 */
import { UIManager } from './modules/uiManager.js';
import { AudioManager } from './modules/audioManager.js';
import { GameEngine } from './modules/gameEngine.js';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Cargar la base de datos desde el archivo JSON
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error("No se pudo cargar la base de datos");
        const data = await response.json();

        // 2. Inicializar Interfaz con sus herramientas
        const ui = new UIManager(data.herramientasExternas);
        
        // 3. Inicializar Audio
        const audio = new AudioManager(ui);

        // 4. Inicializar Motor del Juego con los mensajes y logros cargados
        const game = new GameEngine(ui, audio, data.mensajes, data.logros);

    } catch (error) {
        console.error("Error crítico al iniciar la aplicación:", error);
        alert("Hubo un problema al cargar los datos. Por favor, recarga la página.");
    }
});
