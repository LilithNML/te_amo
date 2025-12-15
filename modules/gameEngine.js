/**
 * modules/gameEngine.js
 * ------------------------------------------------------------------
 * Lógica de Negocio del Juego.
 * Orquesta la validación de códigos, gestión de estado (progreso),
 * sistema de pistas, logros y comunicación con la UI.
 */

import { mensajes, logros } from './data.js';
import { normalizeText, levenshtein } from './utils.js';

export class GameEngine {
    /**
     * @param {UIManager} uiManager - Referencia al gestor de interfaz
     * @param {AudioManager} audioManager - Referencia al gestor de audio
     */
    constructor(uiManager, audioManager) {
        this.ui = uiManager;
        this.audio = audioManager;
        
        // Carga de estado inicial desde LocalStorage (con valores por defecto defensivos)
        this.unlocked = new Set(JSON.parse(localStorage.getItem("desbloqueados") || "[]"));
        this.favorites = new Set(JSON.parse(localStorage.getItem("favoritos") || "[]"));
        this.achievedLogros = new Set(JSON.parse(localStorage.getItem("logrosAlcanzados") || "[]"));
        
        // Estado de intentos fallidos para el sistema de pistas
        this.failedAttempts = parseInt(localStorage.getItem("failedAttempts") || "0");
        this.MAX_FAILED_ATTEMPTS = 5; // Intentos antes de dar una pista

        this.init();
    }

    /**
     * Inicialización y vinculación de eventos
     */
    init() {
        this.updateProgress();
        this.setupEventListeners();
        
        // Vinculación de Callbacks de la UI hacia el Engine
        this.ui.onToggleFavorite = (code) => this.toggleFavorite(code);
        this.ui.onCodeSelected = (code) => this.unlockCode(code, false); // false = ya estaba desbloqueado
        this.ui.onImportData = (data) => this.importProgress(data);
        
        // Renderizado inicial de la lista de desbloqueados
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    /**
     * Configura los listeners del DOM para la entrada de datos
     */
    setupEventListeners() {
        const btn = document.getElementById("submitCodeBtn");
        const input = document.getElementById("codeInput");
        const resetBtn = document.getElementById("menuReset");

        // Enviar al hacer clic
        if (btn) {
            btn.addEventListener("click", () => this.handleInput());
        }
        
        // Enviar al presionar Enter
        if (input) {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault(); // Evitar salto de línea si fuera textarea
                    this.handleInput();
                }
            });
        }

        // Botón de reseteo total
        if (resetBtn) {
            resetBtn.addEventListener("click", () => this.resetProgress());
        }
    }

    /**
     * Procesa la entrada del usuario
     */
    handleInput() {
        const inputRaw = this.ui.elements.input.value;
        
        // Validación básica
        if (!inputRaw || inputRaw.trim() === "") return;

        // 1. UX CRÍTICO: Cerrar el teclado inmediatamente (especialmente para Android)
        this.ui.dismissKeyboard();

        const normalizedInput = normalizeText(inputRaw);
        
        // 2. Buscar coincidencia exacta en las claves de mensajes
        // Iteramos keys para comparar normalizado vs normalizado
        let foundKey = Object.keys(mensajes).find(k => normalizeText(k) === normalizedInput);

        if (foundKey) {
            // ÉXITO
            this.unlockCode(foundKey, true); // true = es un nuevo intento
            this.resetFailedAttempts();
        } else {
            // FALLO
            this.handleIncorrectInput(normalizedInput);
        }
    }

    /**
     * Maneja la lógica cuando el código es incorrecto
     * @param {string} normalizedInput - Texto normalizado ingresado
     */
    handleIncorrectInput(normalizedInput) {
        this.audio.playIncorrect();
        this.ui.showError(); // Animación visual
        
        // Incrementar contador de fallos
        this.failedAttempts++;
        localStorage.setItem("failedAttempts", this.failedAttempts.toString());

        // A. Verificar "Casi lo tienes" (Fuzzy Match)
        let closest = null;
        let minDist = 3; // Distancia de tolerancia

        for (const key of Object.keys(mensajes)) {
            const normalizedKey = normalizeText(key);
            const dist = levenshtein(normalizedInput, normalizedKey);
            
            // Si la distancia es pequeña O si el input está contenido en la clave
            if (dist < minDist || normalizedKey.includes(normalizedInput)) {
                closest = key;
                minDist = dist;
            }
        }

        if (closest) {
             // Feedback alentador si está cerca
             this.ui.renderMessage(
                 "Vas muy bien...", 
                 `Parece que intentas escribir algo parecido a <strong>"${closest}"</strong>. ¡Revisa si falta alguna letra!`
             );
             return; // No damos pista aún para que lo intente él mismo
        }

        // B. Sistema de Pistas (Si supera el umbral de fallos)
        if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
            this.giveHint();
            this.resetFailedAttempts();
        } else {
            // Mensaje de error estándar
            this.ui.renderMessage(
                "Código Incorrecto", 
                `Sigue intentando. Intento ${this.failedAttempts} de ${this.MAX_FAILED_ATTEMPTS} para recibir una ayuda.`
            );
        }
    }

    /**
     * Selecciona y muestra una pista aleatoria de un código no desbloqueado
     */
    giveHint() {
        // Filtrar códigos que NO están desbloqueados y TIENEN pista
        const lockedCandidates = Object.keys(mensajes).filter(k => !this.unlocked.has(k) && mensajes[k].pista);
        
        if (lockedCandidates.length > 0) {
            const randomCode = lockedCandidates[Math.floor(Math.random() * lockedCandidates.length)];
            const pista = mensajes[randomCode].pista;
            this.ui.renderMessage(
                "¡Una Pista para ti!", 
                `Busca algo relacionado con: <em>"${pista}"</em>`
            );
        } else {
            this.ui.renderMessage("¡Vaya!", "Ya has descubierto casi todo, no quedan pistas disponibles.");
        }
    }

    /**
     * Desbloquea un código y actualiza el estado
     * @param {string} key - Clave del código
     * @param {boolean} isNewDiscovery - Si es un nuevo descubrimiento o solo visualización
     */
    unlockCode(key, isNewDiscovery) {
        const data = mensajes[key];
        
        if (isNewDiscovery) {
            this.ui.showSuccess();
            this.audio.playCorrect();
            
            // Si no estaba desbloqueado previamente, guardamos
            if (!this.unlocked.has(key)) {
                this.unlocked.add(key);
                this.saveProgress();
                this.checkLogros();
                this.ui.showToast(`¡Nuevo descubrimiento: ${key}!`);
            }
        }

        // Mostrar el contenido en pantalla
        this.ui.renderContent(data, key);
        this.ui.clearInput(); // Limpia el input visualmente
        
        // Actualizar la lista en segundo plano
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    /**
     * Alterna el estado de favorito de un código
     */
    toggleFavorite(code) {
        if (this.favorites.has(code)) {
            this.favorites.delete(code);
        } else {
            this.favorites.add(code);
        }
        
        localStorage.setItem("favoritos", JSON.stringify([...this.favorites]));
        // Refrescar lista para mostrar el cambio de icono
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
    }

    /**
     * Verifica si se ha cumplido algún logro nuevo
     */
    checkLogros() {
        const count = this.unlocked.size;
        
        logros.forEach(logro => {
            // Si no se tiene el logro Y se cumple el requisito
            if (!this.achievedLogros.has(logro.id) && count >= logro.codigo_requerido) {
                this.achievedLogros.add(logro.id);
                this.ui.showToast(`🏆 Logro Desbloqueado: ${logro.mensaje}`);
                localStorage.setItem("logrosAlcanzados", JSON.stringify([...this.achievedLogros]));
            }
        });
    }

    /**
     * Actualiza la barra de progreso en la UI
     */
    updateProgress() {
        this.ui.updateProgress(this.unlocked.size, Object.keys(mensajes).length);
    }

    /**
     * Guarda el progreso actual en LocalStorage
     */
    saveProgress() {
        localStorage.setItem("desbloqueados", JSON.stringify([...this.unlocked]));
        this.updateProgress();
    }

    resetFailedAttempts() {
        this.failedAttempts = 0;
        localStorage.setItem("failedAttempts", "0");
    }
    
    /**
     * Importa un archivo de progreso JSON
     */
    importProgress(data) {
        // Validación básica del formato del archivo
        if (!data.unlocked || !Array.isArray(data.unlocked)) {
            this.ui.showToast("Error: Formato de archivo incompatible");
            return;
        }

        // Sobrescribir estado
        this.unlocked = new Set(data.unlocked);
        this.favorites = new Set(data.favorites || []);
        this.achievedLogros = new Set(data.achievements || []);

        // Guardar y refrescar
        this.saveProgress();
        this.checkLogros(); // Verificar logros retroactivos si fuera necesario
        this.ui.renderUnlockedList(this.unlocked, this.favorites, mensajes);
        this.ui.showToast("¡Progreso importado con éxito!");
    }

    /**
     * Borra todo el progreso (Reset Factory)
     */
    resetProgress() {
        if (confirm("ADVERTENCIA: ¿Estás seguro de borrar todo tu progreso, favoritos y logros? Esta acción no se puede deshacer.")) {
            localStorage.clear();
            location.reload(); // Recargar para limpiar memoria
        }
    }
}
