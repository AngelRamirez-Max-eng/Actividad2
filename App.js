// Estado global de la aplicación
const state = {
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
    users: JSON.parse(localStorage.getItem('users')) || [],
    characters: JSON.parse(localStorage.getItem('characters')) || [],
    episodes: JSON.parse(localStorage.getItem('episodes')) || [],
    currentRoute: window.location.hash || '#login',
    sortConfig: { key: null, direction: 'asc' }
};

// --- API FETCH & LOCAL STORAGE HYBRID SYSTEM ---
async function initData() {
    if (state.characters.length === 0) {
        try {
            const res = await fetch('https://rickandmortyapi.com/api/character');
            const data = await res.json();
            state.characters = data.results.map(c => ({
                id: c.id,
                name: c.name,
                species: c.species,
                gender: c.gender,
                type: c.type || 'N/A',
                image: c.image
            }));
            localStorage.setItem('characters', JSON.stringify(state.characters));
        } catch (error) {
            console.error("Error cargando personajes, usando respaldo offline", error);
        }
    }
    
    if (state.episodes.length === 0) {
        try {
            const res = await fetch('https://rickandmortyapi.com/api/episode');
            const data = await res.json();
            state.episodes = data.results.map(e => ({
                id: e.id,
                name: e.name,
                air_date: e.air_date,
                episode: e.episode
            }));
            localStorage.setItem('episodes', JSON.stringify(state.episodes));
        } catch (error) {
            console.error("Error cargando episodios, usando respaldo offline", error);
        }
    }
}

// --- ENRUTAMIENTO (SPA) ---
function navigateTo(route) {
    window.location.hash = route;
}

window.addEventListener('hashchange', () => {
    state.currentRoute = window.location.hash || '#login';
    renderApp();
});

// Proteger rutas no autenticadas
function checkAuth() {
    const publicRoutes = ['#login', '#register', '#recover'];
    if (!state.currentUser && !publicRoutes.includes(state.currentRoute)) {
        navigateTo('#login');
        return false;
    }
    if (state.currentUser && publicRoutes.includes(state.currentRoute)) {
        navigateTo('#characters');
        return false;
    }
    return true;
}

// --- VISTAS RENDERIZABLES ---

// 1. Vista de Login
function viewLogin() {
    return `
        <div class="modal-content" style="margin: 4rem auto;">
            <h2>Iniciar Sesión</h2><br>
            <form id="login-form">
                <div class="form-group">
                    <label>Usuario / Email</label>
                    <input type="text" id="login-email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Contraseña</label>
                    <input type="password" id="login-password" class="form-control" required>
                </div>
                <button type="submit" class="btn">Ingresar</button>
            </form>
            <p style="margin-top: 1rem;">¿No tienes cuenta? <a href="#register">Regístrate aquí</a></p>
            <p><a href="#recover">¿Olvidaste tu contraseña?</a></p>
        </div>
    `;
}

// 2. Vista de Registro
function viewRegister() {
    return `
        <div class="modal-content" style="margin: 4rem auto;">
            <h2>Registro de Usuario</h2><br>
            <form id="register-form">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="reg-email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Contraseña</label>
                    <input type="password" id="reg-password" class="form-control" required>
                </div>
                <button type="submit" class="btn">Registrarme</button>
            </form>
            <p style="margin-top: 1rem;">¿Ya tienes cuenta? <a href="#login">Inicia Sesión</a></p>
        </div>
    `;
}

// 3. Vista de Recuperación
function viewRecover() {
    return `
        <div class="modal-content" style="margin: 4rem auto;">
            <h2>Recuperar Contraseña</h2><br>
            <form id="recover-form">
                <div class="form-group">
                    <label>Ingresa tu Email registrado</label>
                    <input type="email" id="recover-email" class="form-control" required>
                </div>
                <button type="submit" class="btn">Enviar instrucciones (Simulado)</button>
            </form>
            <p style="margin-top: 1rem;"><a href="#login">Volver al login</a></p>
        </div>
    `;
}

// 4. Vista de Personajes (Tabla, Buscador, Ordenamiento)
function viewCharacters() {
    return `
        <h2>Gestión de Personajes</h2>
        <div style="margin: 1rem 0; display: flex; gap: 1rem;">
            <input type="text" id="search-char" class="form-control" placeholder="Buscar por nombre en tiempo real...">
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th onclick="sortData('characters', 'id')">ID</th>
                        <th onclick="sortData('characters', 'name')">Nombre</th>
                        <th onclick="sortData('characters', 'species')">Especie</th>
                        <th onclick="sortData('characters', 'gender')">Género</th>
                        <th onclick="sortData('characters', 'type')">Tipo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="characters-table-body">
                    <!-- Se inyecta por JS -->
                </tbody>
            </table>
        </div>
    `;
}

// 5. Vista de Episodios (Tabla, Buscador, Ordenamiento)
function viewEpisodes() {
    return `
        <h2>Gestión de Episodios</h2>
        <div style="margin: 1rem 0; display: flex; gap: 1rem;">
            <input type="text" id="search-epi" class="form-control" placeholder="Buscar episodio por nombre en tiempo real...">
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th onclick="sortData('episodes', 'id')">ID</th>
                        <th onclick="sortData('episodes', 'name')">Nombre</th>
                        <th onclick="sortData('episodes', 'air_date')">Fecha de Emisión</th>
                        <th onclick="sortData('episodes', 'episode')">Código</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="episodes-table-body">
                    <!-- Se inyecta por JS -->
                </tbody>
            </table>
        </div>
    `;
}

// --- RENDERIZADO TABLAS Y FILTRADO ---
function populateCharactersTable(filter = '') {
    const tbody = document.getElementById('characters-table-body');
    if (!tbody) return;
    
    let list = [...state.characters];
    if (filter) {
        list = list.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
    }

    if (state.sortConfig.key) {
        list.sort((a, b) => {
            let valA = a[state.sortConfig.key];
            let valB = b[state.sortConfig.key];
            if (typeof valA === 'string') {
                return state.sortConfig.direction === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            } else {
                return state.sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
        });
    }

    tbody.innerHTML = list.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.species}</td>
            <td>${c.gender}</td>
            <td>${c.type}</td>
            <td>
                <button class="btn" style="padding: 0.25rem 0.5rem;" onclick="showCharacterDetails(${c.id})">Ficha</button>
                <button class="btn" style="padding: 0.25rem 0.5rem; background:#4b5563;" onclick="showEditCharacter(${c.id})">Editar</button>
            </td>
        </tr>
    `).join('');
}

function populateEpisodesTable(filter = '') {
    const tbody = document.getElementById('episodes-table-body');
    if (!tbody) return;

    let list = [...state.episodes];
    if (filter) {
        list = list.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()));
    }

    if (state.sortConfig.key) {
        list.sort((a, b) => {
            let valA = a[state.sortConfig.key];
            let valB = b[state.sortConfig.key];
            if (typeof valA === 'string') {
                return state.sortConfig.direction === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            } else {
                return state.sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
        });
    }

    tbody.innerHTML = list.map(e => `
        <tr>
            <td>${e.id}</td>
            <td>${e.name}</td>
            <td>${e.air_date}</td>
            <td>${e.episode}</td>
            <td>
                <button class="btn" style="padding: 0.25rem 0.5rem;" onclick="showEpisodeDetails(${e.id})">Ver</button>
                <button class="btn" style="padding: 0.25rem 0.5rem; background:#4b5563;" onclick="showEditEpisode(${e.id})">Editar</button>
            </td>
        </tr>
    `).join('');
}

// --- ORDENAMIENTO ---
window.sortData = function(type, key) {
    let direction = 'asc';
    if (state.sortConfig.key === key && state.sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    state.sortConfig = { key, direction };
    if (type === 'characters') populateCharactersTable(document.getElementById('search-char')?.value);
    if (type === 'episodes') populateEpisodesTable(document.getElementById('search-epi')?.value);
};

// --- DETALLES Y EDICIONES (MODALES) ---
window.showCharacterDetails = function(id) {
    const char = state.characters.find(c => c.id === id);
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <div style="text-align: center;">
            <img src="${char.image || 'https://via.placeholder.com/150'}" alt="${char.name}" style="border-radius: 50%; max-width: 150px; margin-bottom: 1rem;">
            <h3>${char.name}</h3>
            <p><strong>Especie:</strong> ${char.species}</p>
            <p><strong>Género:</strong> ${char.gender}</p>
            <p><strong>Tipo:</strong> ${char.type}</p>
        </div>
    `;
    document.getElementById('global-modal').classList.remove('hidden');
};

window.showEditCharacter = function(id) {
    const char = state.characters.find(c => c.id === id);
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <h3>Editar Personaje</h3><br>
        <form id="edit-char-form">
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="edit-char-name" class="form-control" value="${char.name}" required>
            </div>
            <div class="form-group">
                <label>Especie</label>
                <input type="text" id="edit-char-species" class="form-control" value="${char.species}" required>
            </div>
            <div class="form-group">
                <label>Género</label>
                <input type="text" id="edit-char-gender" class="form-control" value="${char.gender}" required>
            </div>
            <button type="submit" class="btn">Guardar</button>
        </form>
    `;
    document.getElementById('global-modal').classList.remove('hidden');

    document.getElementById('edit-char-form').onsubmit = function(e) {
        e.preventDefault();
        char.name = document.getElementById('edit-char-name').value;
        char.species = document.getElementById('edit-char-species').value;
        char.gender = document.getElementById('edit-char-gender').value;
        localStorage.setItem('characters', JSON.stringify(state.characters));
        document.getElementById('global-modal').classList.add('hidden');
        populateCharactersTable();
    };
};

window.showEpisodeDetails = function(id) {
    const epi = state.episodes.find(e => e.id === id);
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <h3>Ficha Técnica del Episodio</h3><br>
        <p><strong>ID:</strong> ${epi.id}</p>
        <p><strong>Nombre:</strong> ${epi.name}</p>
        <p><strong>Fecha de Emisión:</strong> ${epi.air_date}</p>
        <p><strong>Código de Temporada:</strong> ${epi.episode}</p>
    `;
    document.getElementById('global-modal').classList.remove('hidden');
};

window.showEditEpisode = function(id) {
    const epi = state.episodes.find(e => e.id === id);
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <h3>Editar Episodio</h3><br>
        <form id="edit-epi-form">
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="edit-epi-name" class="form-control" value="${epi.name}" required>
            </div>
            <div class="form-group">
                <label>Fecha de Emisión</label>
                <input type="text" id="edit-epi-date" class="form-control" value="${epi.air_date}" required>
            </div>
            <div class="form-group">
                <label>Código de Episodio</label>
                <input type="text" id="edit-epi-code" class="form-control" value="${epi.episode}" required>
            </div>
            <button type="submit" class="btn">Guardar</button>
        </form>
    `;
    document.getElementById('global-modal').classList.remove('hidden');

    document.getElementById('edit-epi-form').onsubmit = function(e) {
        e.preventDefault();
        epi.name = document.getElementById('edit-epi-name').value;
        epi.air_date = document.getElementById('edit-epi-date').value;
        epi.episode = document.getElementById('edit-epi-code').value;
        localStorage.setItem('episodes', JSON.stringify(state.episodes));
        document.getElementById('global-modal').classList.add('hidden');
        populateEpisodesTable();
    };
};

// --- RENDERIZACIÓN GLOBAL ---
function renderNavbar() {
    const nav = document.getElementById('nav-links');
    if (!state.currentUser) {
        nav.innerHTML = `
            <a href="#login" class="${state.currentRoute === '#login' ? 'active' : ''}">Login</a>
            <a href="#register" class="${state.currentRoute === '#register' ? 'active' : ''}">Registro</a>
        `;
    } else {
        nav.innerHTML = `
            <a href="#characters" class="${state.currentRoute === '#characters' ? 'active' : ''}">Personajes</a>
            <a href="#episodes" class="${state.currentRoute === '#episodes' ? 'active' : ''}">Episodios</a>
            <a href="#" id="logout-btn">Cerrar Sesión (${state.currentUser.email})</a>
        `;
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            state.currentUser = null;
            navigateTo('#login');
        });
    }
}

async function renderApp() {
    if (!checkAuth()) return;
    
    renderNavbar();
    const appContent = document.getElementById('app-content');

    if (state.currentRoute === '#login') {
        appContent.innerHTML = viewLogin();
        setupLoginForm();
    } else if (state.currentRoute === '#register') {
        appContent.innerHTML = viewRegister();
        setupRegisterForm();
    } else if (state.currentRoute === '#recover') {
        appContent.innerHTML = viewRecover();
        setupRecoverForm();
    } else if (state.currentRoute === '#characters') {
        await initData();
        appContent.innerHTML = viewCharacters();
        populateCharactersTable();
        document.getElementById('search-char').addEventListener('input', (e) => {
            populateCharactersTable(e.target.value);
        });
    } else if (state.currentRoute === '#episodes') {
        await initData();
        appContent.innerHTML = viewEpisodes();
        populateEpisodesTable();
        document.getElementById('search-epi').addEventListener('input', (e) => {
            populateEpisodesTable(e.target.value);
        });
    }
}

// --- MANEJADORES DE FORMULARIOS ---
function setupLoginForm() {
    document.getElementById('login-form').onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const user = state.users.find(u => u.email === email && u.password === pass);
        
        if (user) {
            state.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            navigateTo('#characters');
        } else {
            alert('Credenciales inválidas. Por favor, intente de nuevo.');
        }
    };
}

function setupRegisterForm() {
    document.getElementById('register-form').onsubmit = function(e) {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        
        if (state.users.some(u => u.email === email)) {
            alert('Este email ya está registrado.');
            return;
        }

        const newUser = { email, password: pass };
        state.users.push(newUser);
        localStorage.setItem('users', JSON.stringify(state.users));
        alert('Usuario creado con éxito. Inicie sesión.');
        navigateTo('#login');
    };
}

function setupRecoverForm() {
    document.getElementById('recover-form').onsubmit = function(e) {
        e.preventDefault();
        alert('Simulación: Si el correo está registrado, se le ha enviado un correo con instrucciones.');
        navigateTo('#login');
    };
}

// --- GESTIÓN DE TEMA Y DIÁLOGOS ---
document.getElementById('theme-toggle').onclick = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

document.getElementById('close-modal').onclick = function() {
    document.getElementById('global-modal').classList.add('hidden');
};

// Cargar preferencia de tema al iniciar
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Arranque inicial de la app
renderApp();