/**
 * main.js
 * Versión Corregida: Intercepción Prioritaria (UseCapture)
 */
import { UIManager } from './modules/uiManager.js';
import { AudioManager } from './modules/audioManager.js';
import { GameEngine } from './modules/gameEngine.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar UI y Audio
    const ui = new UIManager();
    const audio = new AudioManager(ui);

    // 2. INTERCEPCIÓN DE EASTER EGGS (Fase de Captura)
    // Usamos 'true' en addEventListener para interceptar el evento ANTES
    // de que llegue al GameEngine. Esto soluciona el problema de que salga error.
    
    const interceptarEasterEgg = (event) => {
        // Identificar si es Enter en el Input o Click en el Botón
        const target = event.target;
        const input = ui.elements.input;
        const isEnter = (event.type === 'keydown' && event.key === 'Enter');
        
        // Verificar si el evento viene del input o de un botón de chequeo
        // (Buscamos cualquier botón que parezca ser el de "verificar" por si cambió el ID)
        const isBtnClick = (event.type === 'click' && (target.tagName === 'BUTTON' || target.closest('button')));

        if (isEnter || isBtnClick) {
            const texto = input.value;

            // Preguntamos al UI si es un código especial
            if (ui.checkEasterEgg(texto)) {
                console.log("Easter Egg interceptado:", texto);
                
                // 🛑 DETENER TODO: Evita que GameEngine se entere
                event.stopImmediatePropagation();
                event.preventDefault();
                event.stopPropagation();
                
                // Limpieza
                ui.clearInput();
                ui.dismissKeyboard();
            }
        }
    };

    // Agregamos los espías a nivel de DOCUMENTO en fase de CAPTURA (true)
    // Esto garantiza que corran antes que cualquier otro script.
    document.addEventListener("keydown", interceptarEasterEgg, true);
    document.addEventListener("click", interceptarEasterEgg, true);

    // 3. Inicializar Motor del Juego
    const game = new GameEngine(ui, audio);
});
