document.addEventListener('DOMContentLoaded', () => {
    const phrases = [
        "9 de noviembre", "Luna", "Sofia", "Princesa", "Haziel Alan Casarez Osuna", "Alan", "Lilith Noemi Mendoza Luna",
        "Genshin", "Raiden", "Chester", "Mi niña hermosa", "Mi niño hermoso", "Yekaterina", "Samuel", "Fortnite", "dbl",
        "Hijas", "3 de enero", "15 de abril", "Primer novio", "kiss me", "Sonora", "Ciudad Obregon", "Mariachi",
        "Steven universe", "Adriana", "Carmen", "Johanna", "Furina", "Huevito", "Soy tuya", "Te extraño", "Taza de cafe",
        "Te pertenezco", "Me encantas", "Nunca cambies", "Isla corazón", "Cofre lujoso", "Primer te amo", "Cosita hermosa",
        "Alguien como tu", "Tsukasa", "Paimon", "Sobame", "UwU", "Abrazame", "Protogemas", "Gachapon", "Brawl",
        "Minecraft", "mbr7tr5i", "nbujo85ft", "5.1", "nvtnuh67", "omaet", "roma", "Increible", "Orgullosa", "Genial",
        "Soy la mujer mas feliz del mundo", "Gracias", "Eres el mejor", "Mi niño consentido", "Cartas", "Peluche",
        "Miku Nakano", "Gatito", "My way of life", "Enana", "Colette", "Vegetto", "Ellen Joe", "Himiko Toga",
        "El mejor padre del mundo", "Amor eterno", "Nada nos va a separar", "Me gustas mucho", "Espera un poco",
        "Enamorada", "El Sol y la Luna", "Primer hola", "Louie", "Round", "...", "Querido", "Hatsune Miku", ":)",
        "Cuarto creciente", "Gibosa menguante", "Luna llena", "Suegra", "Mami", "Suegrita", "Sexo", "Ojos verdes",
        "Cielo", "Acostados", "A tu lado", "Por que no puedo dejar de pensar en ti", "Te ame desde el primer dia que te conoci", "ha+ln", "teamo0315",
        "Petit bisou", "Sofia Casarez Mendoza", "Star", "Namek", "Kamebesito",
    ];

    const tableBody = document.querySelector('#phrasesTable tbody');
    const copyMessage = document.getElementById('copy-message');

    // Función para renderizar la tabla
    function renderTable() {
        tableBody.innerHTML = ''; // Limpiar el contenido actual de la tabla
        phrases.forEach((phrase, index) => {
            const row = tableBody.insertRow();
            row.setAttribute('data-index', index); // Guardar el índice de la frase

            // Celda del número consecutivo
            const numCell = row.insertCell(0);
            numCell.textContent = index + 1;
            numCell.setAttribute('data-label', 'N°:'); // Para la responsividad móvil

            // Celda de la frase
            const phraseCell = row.insertCell(1);
            phraseCell.textContent = phrase;
            phraseCell.setAttribute('data-label', 'Frase / Texto:'); // Para la responsividad móvil
            phraseCell.classList.add('copyable-cell'); // Añadir clase para identificar celdas copiables

            // Añadir la clase 'copied' si la frase ya fue copiada previamente
            const isCopied = localStorage.getItem(`phrase-${index}-copied`);
            if (isCopied === 'true') {
                row.classList.add('copied');
            }
        });
    }

    // Event listener para copiar el texto
    tableBody.addEventListener('click', async (event) => {
        const targetCell = event.target.closest('.copyable-cell'); // Encuentra la celda con la clase copyable-cell
        if (targetCell) {
            const textToCopy = targetCell.textContent;
            const row = targetCell.closest('tr'); // Obtener la fila completa
            const rowIndex = row.getAttribute('data-index');

            try {
                await navigator.clipboard.writeText(textToCopy);
                showCopyMessage();
                row.classList.add('copied'); // Añadir clase para indicar que fue copiado
                localStorage.setItem(`phrase-${rowIndex}-copied`, 'true'); // Guardar estado en localStorage
            } catch (err) {
                console.error('Error al copiar el texto: ', err);
                // La línea del alert se ha eliminado aquí.
            }
        }
    });

    // Función para mostrar el mensaje de copiado
    function showCopyMessage() {
        copyMessage.classList.add('show');
        setTimeout(() => {
            copyMessage.classList.remove('show');
        }, 1000); // El mensaje desaparece después de 1 segundo
    }

    // Renderizar la tabla inicialmente
    renderTable();
});
