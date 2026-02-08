/**
 * modules/uiManager.js
 * Versión Final Producción: Streaming Seguro + Glassmorphism (Sin Easter Eggs)
 */

import { normalizeText } from './utils.js';
import { descifrarArchivo } from './webCryptoDecryptor.js';

export class UIManager {
        constructor(herramientas) {
        this.herramientas = herramientas || [];
        this.elements = {
            input: document.getElementById("codeInput"),
            contentDiv: document.getElementById("contenido"),
            progressBar: document.querySelector(".progress-bar-fill"),
            progressText: document.getElementById("progreso"),
            toastContainer: document.getElementById("achievement-toast-container"),
            menuButton: document.getElementById("menuButton"),
            dropdownMenu: document.getElementById("dropdownMenu"),
            importInput: document.getElementById("importInput"),
            audioPanel: document.getElementById("audioPanel"),
            closeAudioPanel: document.getElementById("closeAudioPanel"),
            toolsPanel: document.getElementById("toolsPanel"),
            closeToolsPanel: document.getElementById("closeToolsPanel"),
            toolsListContainer: document.getElementById("toolsListContainer"),
            unlockedSection: document.getElementById("unlockedSection"),
            unlockedList: document.getElementById("unlockedList"),
            searchUnlocked: document.getElementById("searchUnlocked"),
            categoryFilter: document.getElementById("categoryFilter"),
            filterFavBtn: document.getElementById("filterFavBtn"),
            closeUnlockedBtn: document.getElementById("closeUnlockedBtn")
        };

        this.cachedPassword = null; 
        this.showingFavoritesOnly = false;
        this.typewriterTimeout = null;

        this.initTheme();
        this.setupMenuListeners();
        this.setupListListeners();
        this.initDynamicPlaceholder();
        setTimeout(() => this.initParticles(), 100); 
    }

    dismissKeyboard() { if (this.elements.input) this.elements.input.blur(); }

    initTheme() {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") document.body.classList.add("dark-mode");
    }

    toggleDarkMode() {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        this.showToast(isDark ? "Modo Oscuro Activado" : "Modo Claro Activado");
    }

    // --- VISUALES ---
    async initParticles() {
        // @ts-ignore
        if (typeof tsParticles === 'undefined') return;
        // @ts-ignore
        await tsParticles.load('tsparticles', {
            fpsLimit: 60, fullScreen: { enable: false },
            particles: {
                number: { value: 30, density: { enable: true, area: 800 } },
                color: { value: ["#ffffff", "#ff7aa8", "#ffd700"] },
                shape: { type: "circle" },
                opacity: { value: 0.7, random: true, animation: { enable: true, speed: 1, minimumValue: 0.3 } },
                size: { value: 3, random: true, animation: { enable: true, speed: 2 } },
                move: { enable: true, speed: 0.6, direction: "none", random: true, outModes: "out" }
            },
            interactivity: { events: { onHover: { enable: true, mode: "bubble" }, onClick: { enable: true, mode: "push" } } },
            detectRetina: true
        });
    }

    initDynamicPlaceholder() {
        const frases = ["Escribe aquí...", "Una fecha especial...", "¿Nuestro lugar?", "Un apodo...", "Nombre de canción...", "Batman"];
        let index = 0;
        setInterval(() => {
            index = (index + 1) % frases.length;
            if(this.elements.input) this.elements.input.setAttribute("placeholder", frases[index]);
        }, 3500);
    }

    triggerConfetti() {
        // @ts-ignore
        if (typeof confetti === 'undefined') return;
        const count = 200; const defaults = { origin: { y: 0.7 }, zIndex: 1500 };
        function fire(r, opts) { 
            // @ts-ignore
            confetti(Object.assign({}, defaults, opts, { particleCount: Math.floor(count * r) })); 
        }
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    }

    typeWriterEffect(element, text) {
    // Limpieza de animación previa
    if (this.typewriterTimeout) {
        clearTimeout(this.typewriterTimeout);
        this.typewriterTimeout = null;
    }

    this.typewriterSkip = false;

    // Protección básica
    if (!element || !text) return;

    element.innerHTML = "";
    element.classList.add("typewriter-cursor");

    let i = 0;
    const textLength = text.length;

    // ---- Velocidad adaptativa ----
    const slowStart = 65;
    const minSpeed = 22;
    const accelRange = Math.min(220, textLength * 0.45);

    // ---- Doble toque real (sin bug móvil) ----
    let lastTapTime = 0;

    const finishInstantly = () => {
        if (!element) return;

        // Cancelar futuras ejecuciones
        this.typewriterSkip = true;
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
            this.typewriterTimeout = null;
        }

        // Render completo
        element.innerHTML = "";
        text.split('\n').forEach((line, idx) => {
            if (idx > 0) element.appendChild(document.createElement('br'));
            element.appendChild(document.createTextNode(line));
        });

        element.classList.remove("typewriter-cursor");
        element.removeEventListener("pointerdown", tapHandler);
    };

    const tapHandler = () => {
        const now = Date.now();
        const delta = now - lastTapTime;

        if (delta > 0 && delta < 300) {
            finishInstantly();
            lastTapTime = 0;
            return;
        }

        lastTapTime = now;
    };

    // Un solo evento, compatible mouse + touch
    element.addEventListener("pointerdown", tapHandler);

    const type = () => {
        // Abortos seguros
        if (!element || this.typewriterSkip) return;

        if (i >= textLength) {
            element.classList.remove("typewriter-cursor");
            element.removeEventListener("pointerdown", tapHandler);
            return;
        }

        const char = text.charAt(i);

        if (char === '\n') {
            element.appendChild(document.createElement('br'));
        } else {
            element.appendChild(document.createTextNode(char));
        }

        // Progresión suave (cartas largas)
        const progress = Math.min(i / accelRange, 1);
        let speed = slowStart - (slowStart - minSpeed) * progress;

        // Pausas humanas
        if (['.', '!', '?'].includes(char)) speed += 280;
        if (char === '\n') speed += 360;

        i++;
        this.typewriterTimeout = setTimeout(type, speed);
    };

    type();
}

    // --- RENDERIZADO ---
    renderContent(data, key) {
        if (this.typewriterTimeout) clearTimeout(this.typewriterTimeout);
        const container = this.elements.contentDiv; 
        container.hidden = false; container.innerHTML = "";

        const h2 = document.createElement("h2");
        h2.textContent = key ? `Descubierto: ${key}` : "¡Sorpresa!";
        h2.style.textTransform = "capitalize";
        container.appendChild(h2);

        if (data.texto && data.type !== 'text' && data.type !== 'internal') {
            const p = document.createElement("p"); p.textContent = data.texto; container.appendChild(p);
        }

        switch (data.type) {
            case "text":
                const pText = document.createElement("p");
                pText.className = "mensaje-texto";
                if (data.categoria && ['pensamiento'].includes(data.categoria.toLowerCase())) {
                    this.typeWriterEffect(pText, data.texto);
                } else {
                    pText.textContent = data.texto;
                }
                container.appendChild(pText);
                break;
            case "audio":
                const audio = document.createElement("audio");
                audio.src = data.audio;
                audio.autoplay = true; // Se reproduce al instante
                audio.controls = false; // Sin controles
                audio.style.display = "none"; // Oculto visualmente

                container.appendChild(audio);

                if (data.texto) {
                    const p = document.createElement("p");
                    p.className = "mensaje-texto";
                    p.style.textAlign = "center";
                    p.innerText = data.texto;
                    container.appendChild(p);
                }
                break;
            case "image":
                const img = document.createElement("img");
                img.src = data.imagen; img.alt = "Secreto"; img.style.cursor = "zoom-in";
                img.onclick = () => {
                    // @ts-ignore
                    const v = new Viewer(img, { hidden(){v.destroy()}, navbar:0, title:0, toolbar: {zoomIn:1, zoomOut:1, reset:1, rotateLeft:1} });
                    v.show();
                };
                container.appendChild(img);
                break;
            case "image_audio":
                const imgMixed = document.createElement("img");
                imgMixed.src = data.imagen; 
                imgMixed.alt = "Momento Especial";
                
                
                imgMixed.style.maxWidth = "100%";
                imgMixed.style.borderRadius = "12px";
                imgMixed.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
                imgMixed.style.cursor = "zoom-in"; 
                
                // Funcionalidad de Zoom (ViewerJS)
                imgMixed.onclick = () => {
                    // @ts-ignore
                    const v = new Viewer(imgMixed, { hidden(){v.destroy()}, navbar:0, title:0, toolbar: {zoomIn:1, zoomOut:1, reset:1, rotateLeft:1} });
                    v.show();
                };
                container.appendChild(imgMixed);

                const audioMixed = document.createElement("audio");
                audioMixed.src = data.audio;
                audioMixed.autoplay = true;
                audioMixed.controls = false;
                audioMixed.style.display = "none";
                container.appendChild(audioMixed);
                
                if (data.texto) {
                    const p = document.createElement("p");
                    p.className = "mensaje-texto"; 
                    p.style.marginTop = "15px";
                    p.innerText = data.texto;
                    container.appendChild(p);
                }
                break;
            case "video":
                if (data.videoEmbed) {
                    const w = document.createElement("div"); w.className="video-wrapper";
                    w.innerHTML = `<div class="video-loader"></div><iframe src="${data.videoEmbed}" class="video-frame" allow="autoplay; encrypted-media; fullscreen" onload="this.style.opacity=1;this.previousElementSibling.style.display='none'"></iframe>`;
                    container.appendChild(w);
                }
                break;
            case "internal":
                const dest = data.archivo || data.link;
                if(!dest) { container.innerHTML += "<p style='color:red'>Error: Sin ruta.</p>"; break; }
                const divInt = document.createElement("div"); divInt.className="internal-wrapper";
                divInt.innerHTML = `<a href="${dest}" target="_blank" class="button small-button" style="margin-bottom:10px"><i class="fas fa-expand"></i> Pantalla Completa</a><iframe src="${dest}" class="internal-frame" style="border:none;background:transparent" allowtransparency="true"></iframe>`;
                container.appendChild(divInt);
                break;
            case "link":
                const aLink = document.createElement("a"); aLink.href=data.link; aLink.target="_blank"; aLink.className="button"; aLink.innerHTML='Abrir Enlace <i class="fas fa-external-link-alt"></i>'; container.appendChild(aLink);
                break;
            
            // --- MANEJO DE DESCARGAS Y STREAMING ---
            case "download":
                const dlBtn = document.createElement("button");
                dlBtn.className = "button";
                dlBtn.style.position = "relative"; 
                dlBtn.style.overflow = "hidden";

                const urlF = data.descarga.url||"";
                const esCifrado = data.encrypted || urlF.endsWith(".enc") || urlF.endsWith(".wenc");
                
                // Limpiar nombre visualmente
                const nombreLimpio = data.descarga.nombre.replace(/\.(wenc|enc)$/i, "");

                const btnContent = esCifrado 
                    ? `<i class="fas fa-lock"></i> Desbloquear ${nombreLimpio}`
                    : `<i class="fas fa-download"></i> Descargar ${nombreLimpio}`;
                
                dlBtn.innerHTML = `<span class="btn-text-layer">${btnContent}</span>`;

                dlBtn.onclick = () => {
                    if (esCifrado) {
                        const iniciarProceso = async (password) => {
                            // UI Carga
                            dlBtn.disabled = true;
                            const progressBg = document.createElement("div");
                            progressBg.className = "progress-btn-bg";
                            dlBtn.prepend(progressBg);
                            const textLayer = dlBtn.querySelector(".btn-text-layer");
                            const originalText = textLayer.innerHTML;

                            try {
                                const blobDescifrado = await descifrarArchivo(
                                    data.descarga.url, 
                                    data.descarga.nombre, 
                                    password,
                                    (percent, statusText) => {
                                        progressBg.style.width = `${percent}%`;
                                        if (percent < 100) {
                                            textLayer.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${percent}% Cargando...`;
                                        } else {
                                            textLayer.innerHTML = `<i class="fas fa-cog fa-spin"></i> ${statusText || 'Abriendo...'}`;
                                        }
                                    }
                                );

                                dlBtn.disabled = false;
                                progressBg.remove();
                                textLayer.innerHTML = originalText;

                                if (blobDescifrado) {
                                    this.cachedPassword = password; 
                                    this.showToast("¡Acceso concedido!");
                                    this.triggerConfetti();
                                    
                                    // Abrir Visor Multimedia (con nombre limpio)
                                    const nombreFinal = data.descarga.nombre.replace(/\.(wenc|enc)$/i, "");
                                    this.renderMediaModal(blobDescifrado, nombreFinal);
                                } else {
                                    this.cachedPassword = null; 
                                    this.showError();
                                    alert("Contraseña incorrecta.");
                                }
                            } catch (err) {
                                dlBtn.disabled = false;
                                if(progressBg) progressBg.remove();
                                textLayer.innerHTML = originalText;
                                console.error(err);
                                if(err.message.includes("ERROR_404")) {
                                    alert("Error 404: Archivo no encontrado.");
                                } else {
                                    alert("Error técnico: " + err.message);
                                }
                            }
                        };

                        if (this.cachedPassword) {
                            iniciarProceso(this.cachedPassword);
                        } else {
                            this.askPassword(nombreLimpio, (pass) => iniciarProceso(pass));
                        }
                    } else {
                        // Descarga directa
                        const a = document.createElement("a"); a.href=data.descarga.url; a.download=data.descarga.nombre; a.click();
                    }
                };
                container.appendChild(dlBtn);
                break;
        }
        container.classList.remove("fade-in"); void container.offsetWidth; container.classList.add("fade-in");
    }

    /**
     * VISOR MULTIMEDIA SEGURO (Alineado)
     */
    renderMediaModal(blob, filename) {
        const ext = filename.split('.').pop().toLowerCase();
        let mimeType = "application/octet-stream";
        let type = "unknown";

        if (['jpg','jpeg','png','gif','webp'].includes(ext)) { mimeType = `image/${ext}`; type = "image"; }
        else if (['mp4','webm','mov'].includes(ext)) { mimeType = `video/${ext === 'mov' ? 'mp4' : ext}`; type = "video"; }
        else if (['mp3','wav','ogg'].includes(ext)) { mimeType = `audio/${ext}`; type = "audio"; }

        if (type === "unknown") {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
            return;
        }

        const safeBlob = new Blob([blob], { type: mimeType });
        const objectUrl = URL.createObjectURL(safeBlob);

        // --- DOM ---
        const overlay = document.createElement("div");
        overlay.className = "media-modal-overlay"; 
        
        const contentContainer = document.createElement("div");
        contentContainer.className = "media-content-container";

        let mediaElement;
        if (type === "image") {
            mediaElement = document.createElement("img");
            mediaElement.className = "secure-media";
        } else if (type === "video") {
            mediaElement = document.createElement("video");
            mediaElement.className = "secure-media";
            mediaElement.controls = true;
            mediaElement.autoplay = true;
            mediaElement.oncontextmenu = (e) => e.preventDefault();
        } else if (type === "audio") {
            mediaElement = document.createElement("audio");
            mediaElement.className = "secure-media-audio";
            mediaElement.controls = true;
            mediaElement.autoplay = true;
            contentContainer.style.height = "auto";
            contentContainer.style.padding = "20px";
            contentContainer.style.background = "rgba(255,255,255,0.1)";
            contentContainer.style.borderRadius = "50px";
        }

        mediaElement.src = objectUrl;
        contentContainer.appendChild(mediaElement);

        const controls = document.createElement("div");
        controls.className = "media-controls";

        const btnDownload = document.createElement("button");
        btnDownload.className = "media-btn";
        btnDownload.innerHTML = '<i class="fas fa-save"></i> Guardar';
        btnDownload.onclick = () => {
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = filename;
            a.click();
        };

        const btnClose = document.createElement("button");
        btnClose.className = "media-btn close";
        btnClose.innerHTML = '<i class="fas fa-times"></i> Cerrar';
        
        const closeFn = () => {
            document.body.removeChild(overlay);
            URL.revokeObjectURL(objectUrl);
        };
        btnClose.onclick = closeFn;

        controls.appendChild(btnDownload);
        controls.appendChild(btnClose);

        // Orden: Imagen arriba, Botones abajo
        overlay.appendChild(contentContainer);
        overlay.appendChild(controls);
        
        document.body.appendChild(overlay);
    }

    /**
     * MODAL PASSWORD (Glassmorphism)
     */
    askPassword(filename, callback) {
        const overlay = document.createElement("div");
        overlay.className = "glass-overlay";
        
        const card = document.createElement("div");
        card.className = "glass-card";
        card.innerHTML = `<h3 style="margin-top:0;">Desbloquear Archivo</h3><p style="font-size:0.9em;margin-bottom:15px;opacity:0.8">Introduce la contraseña para:<br><b>${filename}</b></p>`;

        const input = document.createElement("input");
        input.type = "password"; input.placeholder = "Contraseña...";
        input.style.cssText = "width:100%;padding:12px;margin-bottom:15px;border:1px solid rgba(0,0,0,0.1);border-radius:8px;font-size:16px;box-sizing:border-box;background:rgba(255,255,255,0.9);";
        input.setAttribute("autocomplete", "off"); input.setAttribute("autocorrect", "off"); input.setAttribute("autocapitalize", "off");

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex"; btnContainer.style.gap = "10px";

        const btnCancel = document.createElement("button");
        btnCancel.textContent = "Cancelar";
        btnCancel.style.cssText = "flex:1;padding:10px;border:none;background:rgba(0,0,0,0.1);border-radius:6px;cursor:pointer;color:inherit;";
        
        const btnConfirm = document.createElement("button");
        btnConfirm.textContent = "Desbloquear";
        btnConfirm.style.cssText = "flex:1;padding:10px;border:none;background:var(--primary-color, #ff4d6d);color:white;border-radius:6px;cursor:pointer;font-weight:bold;box-shadow:0 4px 15px rgba(255, 77, 109, 0.4);";

        btnContainer.appendChild(btnCancel); btnContainer.appendChild(btnConfirm);
        card.appendChild(input); card.appendChild(btnContainer); overlay.appendChild(card);
        document.body.appendChild(overlay);
        input.focus();

        const close = () => document.body.removeChild(overlay);
        btnCancel.onclick = close;
        const submit = () => { const pass = input.value; if(pass){ close(); callback(pass); } else { input.style.border = "1px solid red"; input.focus(); } };
        btnConfirm.onclick = submit; input.onkeydown = (e) => { if(e.key === 'Enter') submit(); };
    }

    // --- HELPERS (Toast, Menú, Audio) ---
    renderMessage(t,b){const c=this.elements.contentDiv;c.hidden=0;c.innerHTML=`<h2>${t}</h2><p>${b}</p>`;c.classList.remove("fade-in");void c.offsetWidth;c.classList.add("fade-in");}
    showError(){this.elements.input.classList.add("shake","error");setTimeout(()=>this.elements.input.classList.remove("shake"),500);}
    showSuccess(){this.elements.input.classList.remove("error");this.elements.input.classList.add("success");}
    clearInput(){this.elements.input.value="";}
    updateProgress(u,t){const p=t>0?Math.round((u/t)*100):0;this.elements.progressBar.style.width=`${p}%`;this.elements.progressText.textContent=`Descubiertos: ${u} / ${t}`;}
    showToast(m){const t=document.createElement("div");t.className="achievement-toast";t.textContent=m;this.elements.toastContainer.appendChild(t);setTimeout(()=>t.remove(),4000);}
    updateAudioUI(play,name){const b=document.getElementById("audioPlayPause"); const l=document.getElementById("trackName");if(b)b.innerHTML=play?'<i class="fas fa-pause"></i>':'<i class="fas fa-play"></i>';if(l&&name)l.textContent=name.replace(/_/g," ").replace(/\.[^/.]+$/,"");}
    
    setupMenuListeners(){
        this.elements.menuButton.addEventListener("click",(e)=>{e.stopPropagation();this.elements.dropdownMenu.classList.toggle("show");});
        document.addEventListener("click",(e)=>{if(!this.elements.menuButton.contains(e.target)&&!this.elements.dropdownMenu.contains(e.target))this.elements.dropdownMenu.classList.remove("show");});
        this.bindMenuAction("menuHome",()=>{this.toggleUnlockedPanel(0);window.scrollTo({top:0,behavior:'smooth'});});
        this.bindMenuAction("menuShowUnlocked",()=>this.toggleUnlockedPanel(1));
        this.bindMenuAction("menuFavorites",()=>{this.toggleUnlockedPanel(1);this.showingFavoritesOnly=1;this.updateFilterUI();this.triggerListFilter();});
        this.bindMenuAction("menuDarkMode",()=>this.toggleDarkMode());
        this.bindMenuAction("menuAudio",()=>this.openPanel(this.elements.audioPanel));
        this.bindMenuAction("menuTools",()=>{this.renderTools();this.openPanel(this.elements.toolsPanel);});
        this.bindMenuAction("menuExport",()=>this.exportProgress());
        this.bindMenuAction("menuImport",()=>this.elements.importInput.click());
        this.elements.importInput.addEventListener("change",(e)=>{if(e.target.files.length)this.handleImportFile(e.target.files[0]);this.elements.importInput.value="";});
        if(this.elements.closeAudioPanel)this.elements.closeAudioPanel.addEventListener("click",()=>this.closePanel(this.elements.audioPanel));
        if(this.elements.closeToolsPanel)this.elements.closeToolsPanel.addEventListener("click",()=>this.closePanel(this.elements.toolsPanel));
    }
    bindMenuAction(id,fn){const b=document.getElementById(id);if(b)b.addEventListener("click",()=>{fn();this.elements.dropdownMenu.classList.remove("show");});}
    openPanel(p){if(p){p.classList.add("show");p.setAttribute("aria-hidden","false");}}
    closePanel(p){if(p){p.classList.remove("show");p.setAttribute("aria-hidden","true");}}
    renderTools(){const c=this.elements.toolsListContainer;if(!c)return;c.innerHTML="";this.herramientas.forEach(t=>{const d=document.createElement("div");d.className="tool-card";d.innerHTML=`<div class="tool-header"><i class="${t.icono}"></i> ${t.nombre}</div><div class="tool-desc">${t.descripcion}</div><a href="${t.url}" target="_blank" class="tool-btn">Abrir <i class="fas fa-external-link-alt"></i></a>`;c.appendChild(d);});}
    
    setupListListeners(){
        this.elements.searchUnlocked.addEventListener("input",()=>this.triggerListFilter());
        this.elements.categoryFilter.addEventListener("change",()=>this.triggerListFilter());
        this.elements.filterFavBtn.addEventListener("click",()=>{this.showingFavoritesOnly=!this.showingFavoritesOnly;this.updateFilterUI();this.triggerListFilter();});
        this.elements.closeUnlockedBtn.addEventListener("click",()=>this.toggleUnlockedPanel(0));
    }
    toggleUnlockedPanel(s){this.elements.unlockedSection.hidden=!s;if(s)this.elements.unlockedSection.scrollIntoView({behavior:'smooth'});}
    updateFilterUI(){const b=this.elements.filterFavBtn;b.classList.toggle("active",this.showingFavoritesOnly);b.innerHTML=this.showingFavoritesOnly?'<i class="fas fa-heart"></i> Favoritos':'<i class="far fa-heart"></i> Favoritos';}
    renderUnlockedList(u,f,m){
        this.currentData={u,f,m}; const cats=new Set();Object.values(m).forEach(v=>{if(v.categoria)cats.add(v.categoria)});
        const cur=this.elements.categoryFilter.value; this.elements.categoryFilter.innerHTML='<option value="">Todas</option>';
        cats.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;if(c===cur)o.selected=1;this.elements.categoryFilter.appendChild(o)});
        this.triggerListFilter();
    }
    triggerListFilter(){
        if(!this.currentData)return; const {u,f,m}=this.currentData;
        const s=normalizeText(this.elements.searchUnlocked.value); const cat=this.elements.categoryFilter.value;
        this.elements.unlockedList.innerHTML=""; let vc=0;
        Object.keys(m).sort().forEach(code=>{
            const d=m[code]; const isU=u.has(code);
            if(this.showingFavoritesOnly&&!f.has(code))return;
            if(s&&isU&&!normalizeText(code).includes(s))return;
            if(cat&&d.categoria!==cat)return;
            vc++; const li=document.createElement("li");
            if(isU){
                li.className="lista-codigo-item"; li.innerHTML=`<div style="flex-grow:1"><span class="codigo-text">${code}</span><span class="category">${d.categoria}</span></div>`;
                const fb=document.createElement("button");fb.className=`favorite-toggle-btn ${f.has(code)?'active':''}`;fb.innerHTML=`<i class="${f.has(code)?'fas':'far'} fa-heart"></i>`;
                fb.onclick=(e)=>{e.stopPropagation();if(this.onToggleFavorite)this.onToggleFavorite(code);};
                li.onclick=()=>{if(this.onCodeSelected)this.onCodeSelected(code);this.elements.contentDiv.scrollIntoView({behavior:'smooth'});}; li.appendChild(fb);
            }else{
                li.className="lista-codigo-item locked"; li.innerHTML=`<div style="flex-grow:1;display:flex;align-items:center;"><i class="fas fa-lock lock-icon"></i><div><span class="codigo-text">??????</span><span class="category" style="opacity:0.5">${d.categoria||'Secreto'}</span></div></div>`;
                li.onclick=()=>this.showToast("🔒 ¡Sigue buscando!");
            }
            this.elements.unlockedList.appendChild(li);
        });
        if(vc===0)this.elements.unlockedList.innerHTML='<p style="text-align:center;width:100%;opacity:0.7">Sin resultados.</p>';
    }
    
    exportProgress(){const d={unlocked:JSON.parse(localStorage.getItem("desbloqueados")||"[]"),favorites:JSON.parse(localStorage.getItem("favoritos")||"[]"),achievements:JSON.parse(localStorage.getItem("logrosAlcanzados")||"[]"),timestamp:new Date().toISOString()};const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`progreso_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u);this.showToast("Progreso exportado");}
    handleImportFile(f){const r=new FileReader();r.onload=(e)=>{try{const d=JSON.parse(e.target.result);if(this.onImportData)this.onImportData(d);}catch(z){this.showToast("Archivo inválido");}};r.readAsText(f);}
}
