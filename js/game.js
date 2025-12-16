// Archivo js/game.js

// Funciones para menu.html (Configuración) -------------------------------------

/**
 * Actualiza dinámicamente los campos de entrada de nombres de jugadores.
 * Guarda la nueva configuración (Jugadores/Impostores) en localStorage.
 */
function updatePlayerInputs() {
    const playerCountInput = document.getElementById('playerCount');
    const impostorCountInput = document.getElementById('impostorCount');
    const container = document.getElementById('playerNamesContainer');
    const warning = document.getElementById('impostorWarning');
    const maxPlayers = parseInt(playerCountInput.max);
    const minPlayers = parseInt(playerCountInput.min);

    let pCount = parseInt(playerCountInput.value);
    let iCount = parseInt(impostorCountInput.value);

    // Validación de límites y coherencia
    if (pCount < minPlayers || isNaN(pCount)) pCount = minPlayers;
    if (pCount > maxPlayers) pCount = maxPlayers;
    playerCountInput.value = pCount;

    if (iCount >= pCount) {
        iCount = pCount - 1;
        warning.textContent = "Debe haber al menos un No-Impostor.";
    } else if (iCount < 1) {
        iCount = 1;
    } else {
        warning.textContent = "";
    }
    impostorCountInput.value = iCount;

    // --- Guardar valores en localStorage después de validación ---
    localStorage.setItem('playerCount', pCount);
    localStorage.setItem('impostorCount', iCount);
    // -----------------------------------------------------------

    // Generar Inputs de Nombres
    container.innerHTML = '';
    for (let i = 1; i <= pCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `player-${i}`;
        input.placeholder = `Jugador ${i}`;
        // Siempre se carga el nombre guardado, si existe
        input.value = localStorage.getItem(`player-${i}-name`) || `Jugador ${i}`; 
        
        const label = document.createElement('label');
        label.setAttribute('for', `player-${i}`);
        label.textContent = `Nombre ${i}:`;

        container.appendChild(label);
        container.appendChild(input);
    }
}

/**
 * Guarda la configuración de la partida en localStorage y redirige al juego.
 */
function startGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    const impostorCount = parseInt(document.getElementById('impostorCount').value);
    const errorMessage = document.getElementById('error-message');
    
    const players = [];
    for (let i = 1; i <= playerCount; i++) {
        const input = document.getElementById(`player-${i}`);
        let name = input.value.trim();
        if (name === "") name = input.placeholder; // Usar placeholder si está vacío
        
        players.push({ name: name });
        localStorage.setItem(`player-${i}-name`, name); // Guardar nombre para la próxima
    }

    if (impostorCount >= playerCount) {
        errorMessage.textContent = "Error: El número de impostores no puede ser mayor o igual al número de jugadores.";
        return;
    }
    if (players.some(p => p.name === "")) {
        errorMessage.textContent = "Error: Todos los jugadores deben tener un nombre.";
        return;
    }
    errorMessage.textContent = ""; // Limpiar error si todo va bien

    // 1. Elegir Palabra/Pista
    if (typeof WORD_LIST === 'undefined') {
        console.error("Error: words.js no se ha cargado correctamente.");
        errorMessage.textContent = "Error de configuración: Falta cargar words.js.";
        return;
    }
    const randomIndex = Math.floor(Math.random() * WORD_LIST.length);
    const secretWordData = WORD_LIST[randomIndex];

    // 2. Asignar Roles
    const roles = Array(impostorCount).fill('Impostor').concat(Array(playerCount - impostorCount).fill('Tripulante'));
    // Función de Fisher-Yates para mezclar
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // 3. Crear Estructura de Partida
    const gameData = {
        word: secretWordData.word,
        clue: secretWordData.clue,
        players: players.map((player, index) => ({
            name: player.name,
            role: roles[index]
        })),
        currentPlayerIndex: 0 
    };

    // 4. Guardar Partida y Redirigir
    localStorage.setItem('currentGameData', JSON.stringify(gameData));
    window.location.href = 'game.html';
}

// Funciones para game.html (Partida) -------------------------------------------

let gameData = null;

/**
 * Carga los datos de la partida al iniciar game.html.
 */
function loadGame() {
    const storedData = localStorage.getItem('currentGameData');
    if (!storedData) {
        window.location.href = 'menu.html';
        return;
    }
    
    gameData = JSON.parse(storedData);
    displayCurrentPlayerIdentity();
}

/**
 * Muestra el nombre y el rol/palabra del jugador actual.
 */
function displayCurrentPlayerIdentity() {
    const player = gameData.players[gameData.currentPlayerIndex];
    
    document.getElementById('currentPlayerName').textContent = player.name;
    document.getElementById('playerRole').textContent = 'Oculto...';
    document.getElementById('clue-container').style.display = 'none';
    
    // Asegurarse de que el rol esté oculto y resetear estilos de animación
    document.getElementById('role-display').classList.remove('role-revealed');
    document.getElementById('playerRole').style.color = ''; 
    document.getElementById('playerRole').style.fontSize = '2.5rem'; // Tamaño base

    document.getElementById('identity-section').style.display = 'block';
    document.getElementById('game-started-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';

    const nextButton = document.getElementById('nextPlayerButton');
    if (gameData.currentPlayerIndex < gameData.players.length) {
        nextButton.textContent = "Revelar mi Rol";
        nextButton.onclick = revealRole;
    } else {
        nextButton.style.display = 'none';
    }
}

/**
 * Muestra el rol real al hacer click en el botón.
 */
function revealRole() {
    const player = gameData.players[gameData.currentPlayerIndex];
    const roleTextElement = document.getElementById('playerRole');
    const roleDisplay = document.getElementById('role-display'); 
    
    // 1. Resetear y forzar reflow para reiniciar la animación
    roleDisplay.classList.remove('role-revealed');
    void roleDisplay.offsetWidth; 

    // 2. Configurar contenido y estilos
    const clueContainer = document.getElementById('clue-container');
    const groupClueElement = document.getElementById('groupClue');

    if (player.role === 'Impostor') {
        roleTextElement.textContent = '¡IMPOSTOR!';
        roleTextElement.style.color = 'var(--accent-color)'; // Color rojo para el rol
        roleTextElement.style.fontSize = '3.5rem'; // Tamaño de texto más grande para el impostor
        clueContainer.style.display = 'block';
        groupClueElement.textContent = gameData.clue;
    } else {
        roleTextElement.textContent = gameData.word;
        roleTextElement.style.color = 'var(--primary-color)'; // Color azul/morado para la palabra
        roleTextElement.style.fontSize = '3.0rem'; // Tamaño de texto para la palabra
        clueContainer.style.display = 'none';
    }

    // 3. Aplicar la animación de revelación
    roleDisplay.classList.add('role-revealed');

    // 4. Cambiar botón a "Pasar"
    const nextButton = document.getElementById('nextPlayerButton');
    nextButton.textContent = "Pasar al Siguiente Jugador";
    nextButton.onclick = nextPlayer;
}


/**
 * Pasa al siguiente jugador o inicia la fase de debate.
 */
function nextPlayer() {
    gameData.currentPlayerIndex++;

    if (gameData.currentPlayerIndex < gameData.players.length) {
        // Continuar al siguiente jugador
        localStorage.setItem('currentGameData', JSON.stringify(gameData)); 
        displayCurrentPlayerIdentity();
    } else {
        // Todos han visto su rol, inicia el debate/partida
        document.getElementById('identity-section').style.display = 'none';
        document.getElementById('game-started-section').style.display = 'block';
        localStorage.removeItem('currentGameData');
    }
}

/**
 * Muestra los resultados finales de la partida.
 */
function revealResults() {
    document.getElementById('game-started-section').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';

    // Mostrar Palabra
    document.getElementById('finalWord').textContent = gameData.word;
    
    // Mostrar Impostores
    const impostors = gameData.players
        .filter(p => p.role === 'Impostor')
        .map(p => p.name)
        .join(', ');
        
    document.getElementById('finalImpostors').textContent = impostors || '¡Ninguno! (Error de Config)';
}