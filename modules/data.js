/**
 * modules/data.js
 * Contiene la "base de datos" de secretos y logros.
 */

export const mensajes = {
  "descargapdf": {
    type: "download", // Normalizado para usar switch
    descarga: { url: "assets/hola.pdf", nombre: "hola.pdf" },
    categoria: "descargas",
    pista: "un archivo que hicimos juntos"
  },
  "playlistsecreta": {
    type: "link",
    link: "https://hoyo/music3",
    categoria: "musica",
    pista: "nuestra canción favorita"
  },
  "fotonuestra": { // Clave normalizada (sin guion bajo)
    type: "image",
    imagen: "assets/image/hola.jpg",
    texto: "Últimas vacaciones juntos", // Texto Alt
    categoria: "recuerdos",
    pista: "últimas vacaciones juntos"
  },
  "fortnite": {
    type: "video",
    texto: "Amo jugar contigo",
    videoEmbed: "https://www.youtube.com/embed/VIDEO_ID", 
    categoria: "dedicatorias",
    pista: "una serenata que te hice"
  },
  "9denoviembre": {
    type: "text",
    texto: "holi",
    categoria: "carta",
    pista: "un saludo"
  }
};

export const logros = [
  {
    id: "primer_paso",
    codigo_requerido: 1,
    mensaje: "¡Primer paso desbloqueado!",
    categoria: "Intro"
  },
  {
    id: "mitad_camino",
    codigo_requerido: Math.floor(Object.keys(mensajes).length / 2),
    mensaje: "¡A mitad del camino!",
    categoria: "Progreso"
  },
  {
    id: "todos_los_secretos",
    codigo_requerido: Object.keys(mensajes).length,
    mensaje: "¡Todos los secretos desbloqueados!",
    categoria: "Final"
  }
];
