// Constantes y elementos del DOM
let currentFile = null;
const codeInput = document.getElementById('codeInput');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const loveCard = document.querySelector('.love-card');

// Función para inicializar Particles.js
function initParticles() {
    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 130, // CANTIDAD de partículas
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#8B5CF6"
            },
            "shape": {
                "type": "circle",
                "stroke": {
                    "width": 0,
                    "color": "#000000"
                },
                "polygon": {
                    "nb_sides": 5
                }
            },
            "opacity": {
                "value": 0.8,
                "random": true,
                "anim": {
                    "enable": false,
                    "speed": 1,
                    "opacity_min": 0.1,
                    "sync": false
                }
            },
            "size": {
                "value": 3,
                "random": true,
                "anim": {
                    "enable": false,
                    "speed": 4,
                    "size_min": 0.1,
                    "sync": false
                }
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#A05CF0",
                "opacity": 0.5,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 1.5, // VELOCIDAD de las partículas
                "direction": "none",
                "random": true,
                "straight": false,
                "out_mode": "out",
                "bounce": false,
                "attract": {
                    "enable": false,
                    "rotateX": 600,
                    "rotateY": 1200
                }
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab"
                },
                "onclick": {
                    "enable": true,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 140,
                    "line_linked": {
                        "opacity": 1
                    }
                },
                "bubble": {
                    "distance": 400,
                    "size": 40,
                    "duration": 2,
                    "opacity": 8,
                    "speed": 3
                },
                "repulse": {
                    "distance": 200,
                    "duration": 0.4
                },
                "push": {
                    "particles_nb": 4
                },
                "remove": {
                    "particles_nb": 2
                }
            }
        },
        "retina_detect": true
    });
}

// Función para validar el código
function validateCode() {
    submitBtn.disabled = true;
    downloadBtn.disabled = true;

    const code = codeInput.value.trim().toLowerCase();

    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    downloadSection.classList.remove('show');
    loveCard.classList.remove('shake');

    if (codes?.[code]) { // 'codes' ahora viene de data.js
        currentFile = codes?.[code];
        setTimeout(() => {
            successMessage.classList.add('show');
            successMessage.focus();
            setTimeout(() => {
                downloadSection.classList.add('show');
                downloadBtn.focus();
                downloadBtn.disabled = false;
            }, 500);
        }, 200);
    } else {
        loveCard.classList.add('shake');
        setTimeout(() => {
            errorMessage.classList.add('show');
            errorMessage.focus();
            loveCard.classList.remove('shake');
            submitBtn.disabled = false;
        }, 300);
    }

    codeInput.value = '';
    if (!codes?.[code]) {
        setTimeout(() => {
            submitBtn.disabled = false;
        }, 500);
    }
}

// Función para descargar el archivo
function downloadFile() {
    if (!currentFile) {
        console.error("No hay archivo seleccionado para descargar.");
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Descargando...';

    const link = document.createElement('a');
    link.href = currentFile;
    link.download = currentFile.split('/').pop();

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        alert('¡Espero que te guste mi regalo! Te amo mucho 💜');
        resetUI();
    }, 1000);
}

// Función para reiniciar la interfaz
function resetUI() {
    codeInput.value = '';
    currentFile = null;
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
    downloadSection.classList.remove('show');
    submitBtn.disabled = false;
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span aria-hidden="true">📥</span><span>Descargar mi regalo</span>';
}

// Event Listeners
codeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        validateCode();
    }
});

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');

    body.classList.toggle('dark');

    if (body.classList.contains('dark')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');

    if (savedTheme === 'light') {
        body.classList.remove('dark');
        themeIcon.textContent = '🌙';
    } else {
        body.classList.add('dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', function() {
    initParticles();
    loadTheme();
    submitBtn.disabled = false;
});
