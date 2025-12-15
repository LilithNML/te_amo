/**
 * modules/audioManager.js
 */
export class AudioManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.bgMusic = document.getElementById("bgMusic");
        this.correctSound = document.getElementById("correctSound");
        this.incorrectSound = document.getElementById("incorrectSound");
        
        // Define aquí tus 10 canciones
        this.playlist = [
             "assets/audio/playlist/music1.mp3",
             "assets/audio/playlist/music2.mp3",
             "assets/audio/playlist/music3.mp3",
             "assets/audio/playlist/music4.mp3",
             "assets/audio/playlist/music5.mp3"
        ];
        
        this.currentTrackIndex = parseInt(localStorage.getItem("currentTrack") || "0");
        this.isShuffling = false;
        
        this.setupPanelControls();
        
        if(this.bgMusic) {
            this.bgMusic.volume = 0.3;
            this.bgMusic.addEventListener("ended", () => this.nextTrack());
        }
    }

    setupPanelControls() {
        const prev = document.getElementById("audioPrev");
        const next = document.getElementById("audioNext");
        const pp = document.getElementById("audioPlayPause");
        const vol = document.getElementById("volumeSlider");
        const mute = document.getElementById("audioMute");
        const shuffle = document.getElementById("audioShuffle");

        if(prev) prev.onclick = () => this.prevTrack();
        if(next) next.onclick = () => this.nextTrack();
        if(pp) pp.onclick = () => this.toggleMusic();
        
        if(vol) vol.addEventListener("input", (e) => { if(this.bgMusic) this.bgMusic.volume = e.target.value; });
        
        if(mute) mute.onclick = () => {
            if(!this.bgMusic) return;
            this.bgMusic.muted = !this.bgMusic.muted;
            mute.innerHTML = this.bgMusic.muted ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
            mute.classList.toggle("active");
        };
        
        if(shuffle) shuffle.onclick = () => {
            this.isShuffling = !this.isShuffling;
            shuffle.classList.toggle("active");
            this.ui.showToast(this.isShuffling ? "Aleatorio Activado" : "Aleatorio Desactivado");
        };
    }

    toggleMusic() {
        if (!this.bgMusic) return;
        if (this.bgMusic.paused) {
            this.bgMusic.play().catch(e => console.warn("Autoplay bloqueado hasta interacción"));
        } else {
            this.bgMusic.pause();
        }
        this.updateUIState();
    }

    nextTrack() {
        if (this.isShuffling) {
            this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        }
        this._loadAndPlay();
    }

    prevTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        this._loadAndPlay();
    }

    _loadAndPlay() {
        if (!this.bgMusic) return;
        this.bgMusic.src = this.playlist[this.currentTrackIndex];
        localStorage.setItem("currentTrack", this.currentTrackIndex);
        this.bgMusic.play().catch(() => {});
        this.updateUIState();
    }

    updateUIState() {
        const src = this.playlist[this.currentTrackIndex];
        const name = src ? src.substring(src.lastIndexOf('/')+1) : "Pista";
        this.ui.updateAudioUI(!this.bgMusic.paused, name);
    }
    
    playCorrect() { if(this.correctSound) { this.correctSound.currentTime=0; this.correctSound.play().catch(()=>{}); } }
    playIncorrect() { if(this.incorrectSound) { this.incorrectSound.currentTime=0; this.incorrectSound.play().catch(()=>{}); } }
}
