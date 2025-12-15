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
    texto: "holi",
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
