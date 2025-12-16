/**
 * modules/data.js
 */

export const mensajes = {
  "descargapdf": {
    type: "download",
    descarga: { url: "assets/images/moon.webp", nombre: "hola.webp" },
    categoria: "descargas",
    pista: "un archivo que hicimos juntos"
  },
  "playlistsecreta": {
    type: "link",
    link: "https://anilist.co/home",
    categoria: "musica",
    pista: "nuestra canción favorita"
  },
  "fotonuestra": {
    type: "image",
    imagen: "assets/images/moon.webp",
    texto: "Últimas vacaciones juntos",
    categoria: "recuerdos",
    pista: "últimas vacaciones juntos"
  },
  "fortnite": {
    type: "video",
    texto: "Amo jugar contigo",
    videoEmbed: "https://www.youtube.com/embed/3LSpFmja7Qk", 
    categoria: "dedicatorias",
    pista: "una serenata que te hice"
  },
  "9denoviembre": {
    type: "text",
    texto: "<p>Mi amor:</p><p>A veces me gusta cerrar los ojos y volver a ese primer momento en que coincidimos en Genshin. No fue casualidad, fue destino disfrazado de juego. Entre combates, misiones y risas, ahí estabas tú, al principio solo un amigo, pero con una energía que poco a poco me fue envolviendo.</p><p>Recuerdo cómo nos ayudábamos en el juego, cómo sin darnos cuenta empezamos a hablar más allá de los objetivos del día. No sabía que, tras ese personaje, había alguien que se convertiría en alguien tan especial para mí. Que ese primer saludo se transformaría en tantas conversaciones, cariño, y complicidad.</p><p>Nunca imaginé que un juego de fantasía me llevaría al mejor encuentro de mi vida, tú. Y desde entonces, cada día contigo ha sido una aventura más hermosa que cualquier historia dentro del juego.</p><p>Gracias por aparecer en mi mundo como un regalo inesperado. Gracias por quedarte.</p><p>Con todo mi amor,<br><em>Lilith</em></p>",
    categoria: "carta",
    pista: "un saludo"
  }
};

export const logros = [
  {
    id: "primer_paso",
    codigo_requerido: 1,
    mensaje: "¡Primer paso desbloqueado! Hay muchos más esperándote.",
  },
  {
    id: "cinco_secretos",
    codigo_requerido: 5,
    mensaje: "¡Cinco secretos revelados! Eres una gran exploradora.",
  },
  {
    id: "mitad_camino",
    codigo_requerido: Math.floor(Object.keys(mensajes).length / 2),
    mensaje: "¡A mitad del camino! ¡Vas muy bien!",
  },
  {
    id: "todos_los_secretos",
    codigo_requerido: Object.keys(mensajes).length,
    mensaje: "¡Todos los secretos desbloqueados! ¡Eres increíble!",
  }
];

/* seccion de herramientas */

export const herramientasExternas = [
  {
    nombre: "Desencriptar",
    descripcion: "Herramienta web para desencriptar imágenes de forma rápida.",
    url: "https://hat.vercel.app/",
    icono: "fas fa-key" // Se usa FontAwesome
  }
  // Aquí agregar más herramientas en el futuro
];
