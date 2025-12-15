/**
 * modules/audioManager.js
 * Controla música de fondo, efectos y playlist.
 */
export class AudioManager {
    constructor() {
        this.bgMusic = document.getElementById("bgMusic");
        this.correctSound = document.getElementById("correctSound");
        this.incorrectSound = document.getElementById("incorrectSound");
        
        this.playlist = [
            "assets/audio/playlist/music1.mp3",
            "assets/audio/playlist/music2.mp3",
            // Agrega el resto aquí
        ];
        
        this.currentTrackIndex = parseInt(localStorage.getItem("currentTrack") || "0");
        this.isPlaying = false;
        
        // Inicializar volumen
        if(this.bgMusic) this.bgMusic.volume = 0.35;
        
        // Eventos
        if(this.bgMusic) this.bgMusic.addEventListener("ended", () => this.nextTrack());
    }

    playCorrect() {
        this._safePlay(this.correctSound);
    }

    playIncorrect() {
        this._safePlay(this.incorrectSound);
    }

    toggleMusic() {
        if (!this.bgMusic) return;
        if (this.bgMusic.paused) {
            this._playMusic();
        } else {
            this.bgMusic.pause();
            this.isPlaying = false;
        }
        return !this.bgMusic.paused;
    }

    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this._loadAndPlay();
    }

    _loadAndPlay() {
        if (!this.bgMusic) return;
        this.bgMusic.src = this.playlist[this.currentTrackIndex];
        localStorage.setItem("currentTrack", this.currentTrackIndex);
        this._playMusic();
    }

    _playMusic() {
        // Evita el error "The play() request was interrupted"
        const playPromise = this.bgMusic.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => { this.isPlaying = true; })
                .catch(error => console.log("Autoplay prevenido por el navegador:", error));
        }
    }

    // Helper privado para efectos cortos
    _safePlay(audioElement) {
        if (!audioElement) return;
        audioElement.currentTime = 0; // Reiniciar sonido
        audioElement.play().catch(() => {}); // Ignorar error si usuario no interactuó
    }
}
