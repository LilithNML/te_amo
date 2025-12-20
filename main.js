/**
 * main.js
 * Punto de entrada principal.
 * Gestiona la inicialización y la intercepción de Easter Eggs.
 */
import { UIManager } from './modules/uiManager.js';
import { AudioManager } from './modules/audioManager.js';
import { GameEngine } from './modules/gameEngine.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar Sistemas de Interfaz y Audio
    const ui = new UIManager();
    const audio = new AudioManager(ui);

    // 2. CONFIGURACIÓN DE EASTER EGGS (Intercepción)
    // Inyectamos esta lógica ANTES de iniciar el GameEngine.
    // Esto permite capturar palabras mágicas (como "Navidad") y evitar
    // que el juego intente buscarlas como archivos y muestre error.

    const input = ui.elements.input;
    // Buscamos el botón de verificar. Asegúrate de que en tu HTML tenga id="checkBtn"
    const checkBtn = document.getElementById("checkBtn"); 

    const interceptarEasterEgg = (event) => {
        // Solo nos interesa la tecla Enter o el Click del botón
        if (event.type === 'keydown' && event.key !== 'Enter') return;

        const texto = input.value;

        // Llamamos a la función de verificación del UIManager
        if (ui.checkEasterEgg(texto)) {
            // ¡Es un Easter Egg!
            console.log("Easter Egg activado:", texto);
            
            // 🛑 IMPORTANTE: Detenemos la propagación inmediata.
            // Esto evita que GameEngine reciba el evento y diga "Código inválido".
            event.stopImmediatePropagation();
            event.preventDefault();
            
            // Limpieza visual
            ui.clearInput();
            ui.dismissKeyboard();
        }
        // Si no es Easter Egg, el evento pasa normalmente al GameEngine.
    };

    // Agregamos nuestros espías (listeners) primero
    if (input) {
        input.addEventListener("keydown", interceptarEasterEgg);
    }
    
    if (checkBtn) {
        checkBtn.addEventListener("click", interceptarEasterEgg);
    } else {
        console.warn("Advertencia: No se encontró el botón con id='checkBtn'. Los Easter Eggs solo funcionarán con Enter.");
    }

    // 3. Inicializar Motor del Juego
    // GameEngine agregará sus propios listeners, pero se ejecutarán DESPUÉS de los nuestros.
    const game = new GameEngine(ui, audio);
});
