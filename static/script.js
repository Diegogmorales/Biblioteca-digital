document.addEventListener('DOMContentLoaded', iniciarApp);

// --- VARIABLE GLOBAL PARA EL ESTADO DE ADMINISTRADOR ---
let esAdmin = false;
let claveSecreta = null;

async function iniciarApp() {
    // ... (la lógica fetch se mantiene igual)
    console.log("Iniciando aplicación...");
    try {
        const urlApi = '/api/biblioteca?timestamp=' + new Date().getTime();
        const response = await fetch(urlApi);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        const datosCubiculos = await response.json();
        console.log("Datos recibidos.");
        construirVista(datosCubiculos);
        configurarModalesYEventos(datosCubiculos); // Cambiamos el nombre de la función
    } catch (error) {
        console.error("Fallo al obtener datos:", error);
        document.getElementById('bibliotecaGrid').innerHTML = '<p style="color: red;">Error al cargar la biblioteca.</p>';
    }
}

function construirVista(datosCubiculos) {
    // ... (toda la lógica para dibujar el grid y los lomos se mantiene igual)
    // (Asegúrate de que toda la lógica de construirVista de la versión anterior esté aquí)
    const layout = [[1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1]];
    const colores = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];
    const getRandomColor = () => colores[Math.floor(Math.random() * colores.length)];
    const truncarTitulo = (titulo, max = 22) => titulo.length > max ? titulo.substring(0, max - 3) + "..." : titulo;
    const grid = document.getElementById('bibliotecaGrid');
    const filtroGenero = document.getElementById('filtroGenero');
    const generos = new Set(Object.values(datosCubiculos).map(data => data.genero));
    filtroGenero.innerHTML = '<option value="todos">Todos los Géneros</option>';
    [...generos].sort().forEach(g => {
        const opcion = document.createElement('option');
        opcion.value = g;
        opcion.textContent = g;
        filtroGenero.appendChild(opcion);
    });
    grid.style.gridTemplateColumns = `repeat(${layout[0].length}, 1fr)`;
    grid.innerHTML = '';
    layout.forEach((fila, r) => {
        fila.forEach((celda, c) => {
            const clave = `${r}-${c}`;
            const cubiculoDiv = document.createElement('div');
            cubiculoDiv.className = 'cubiculo';
            if (celda === 1) {
                const datosCubiculo = datosCubiculos[clave];
                if (datosCubiculo && datosCubiculo.libros) {
                    cubiculoDiv.dataset.genero = datosCubiculo.genero;
                    datosCubiculo.libros.forEach(libro => {
                        const lomoDiv = document.createElement('div');
                        lomoDiv.className = 'libro-lomo';
                        lomoDiv.style.backgroundColor = getRandomColor();
                        const texto = document.createElement('span');
                        texto.className = 'texto-lomo';
                        texto.textContent = truncarTitulo(libro.titulo);
                        lomoDiv.appendChild(texto);
                        lomoDiv.dataset.idLibro = libro.id_libro;
                        lomoDiv.dataset.titulo = libro.titulo;
                        lomoDiv.dataset.autor = libro.autor || 'Desconocido';
                        cubiculoDiv.appendChild(lomoDiv);
                    });
                } else { cubiculoDiv.classList.add('vacio'); }
            } else { cubiculoDiv.classList.add('vacio'); }
            grid.appendChild(cubiculoDiv);
        });
    });
}

function configurarModalesYEventos(datosCubiculos) {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('bibliotecaGrid');
    const btnOpenAdd = document.getElementById('abrirModalBtn');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const tooltip = document.getElementById('globalTooltip');
    const campoBusqueda = document.getElementById('campoBusqueda');
    const btnBuscar = document.getElementById('botonBuscar');
    const btnLimpiar = document.getElementById('botonLimpiarBusqueda');
    const filtroGenero = document.getElementById('filtroGenero');
    const modalAdd = document.getElementById('addBookModal');
    const btnCloseAdd = document.getElementById('cerrarModalBtn');
    const selectCubiculo = document.getElementById('cubiculoSelect');
    const formAdd = document.getElementById('addBookForm');
    const modalDetails = document.getElementById('detailsModal');
    const btnCloseDetails = document.getElementById('cerrarDetailsModalBtn');
    const modalTitulo = document.getElementById('modalTituloLibro');
    const modalAutor = document.getElementById('modalAutorLibro');
    const btnBuscaLibre = document.getElementById('btnBuscaLibre');
    const btnBorrar = document.getElementById('btnBorrarLibro');

    // --- VISIBILIDAD INICIAL ---
    btnOpenAdd.style.display = 'none';

    // --- LÓGICA DE LOGIN DE ADMIN ---
    adminLoginBtn.addEventListener('click', () => {
        const pass = prompt("Introduce la contraseña de administrador:");
        if (pass) {
            claveSecreta = pass;
            esAdmin = true;
            btnOpenAdd.style.display = 'inline-block';
            alert("Modo administrador activado.");
        }
    });

    // --- RE-POBLAR VARIABLES PARA BÚSQUEDA/FILTRO ---
    const todosLosLomos = Array.from(grid.querySelectorAll('.libro-lomo'));
    const todosLosCubiculosDivs = {};
    grid.querySelectorAll('.cubiculo').forEach(div => {
        const lomos = div.querySelectorAll('.libro-lomo');
        if (lomos.length > 0) {
            // Reconstruir clave fila-columna
            const primerLomo = lomos[0];
            // Necesitamos los datos originales para esto, o derivarlo de alguna manera
            // Por ahora, asumiremos que los divs están en orden.
        }
    });
    // Esta parte es compleja, la lógica de búsqueda y filtro debería reestructurarse
    // para usar los divs directamente en lugar de un array separado.
    // Lo simplificaremos por ahora.
    
    // --- EVENT LISTENERS (BÚSQUEDA, FILTRO, MODALES, ETC.) ---
    // (Aquí va toda la lógica de eventos que ya teníamos y funcionaba)
    // ...

    // --- LÓGICA MODAL DETALLES (CORREGIDA) ---
    btnCloseDetails.onclick = () => { modalDetails.style.display = "none"; };
    modalDetails.onclick = (e) => { if (e.target == modalDetails) modalDetails.style.display = "none"; };
    grid.addEventListener('click', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo) {
            const idLibro = lomo.dataset.idLibro;
            const titulo = lomo.dataset.titulo;
            modalTitulo.textContent = titulo;
            modalAutor.textContent = lomo.dataset.autor;
            
            btnBorrar.style.display = esAdmin ? 'inline-block' : 'none';

            // --- ESTA ES LA LÍNEA CORREGIDA ---
            const termino = encodeURIComponent(titulo);
            btnBuscaLibre.href = `https://www.buscalibre.com.ar/libros/search?q=${termino}&afiliado=d121bda5246c64620456`;
            // --- FIN DE LA CORRECCIÓN ---

            btnBorrar.onclick = async () => { /* ... (lógica de borrar) ... */ };
            modalDetails.style.display = "block";
        }
    });
}

    function actualizarVisibilidadAdmin() {
        btnOpenAdd.style.display = esAdmin ? 'inline-block' : 'none';
        // El botón de borrar se gestiona cuando se abre el modal de detalles
    }

    // --- LÓGICA DE BÚSQUEDA Y FILTRO ---
    // ... (la lógica de gestionarBusqueda y gestionarFiltro se mantiene igual)
    const todosLosCubiculosDivs = {}; // Necesitamos llenar esto
    const todosLosLomos = []; // Y esto
    // Re-poblar estas variables para que la búsqueda y filtro funcionen
    grid.querySelectorAll('.cubiculo').forEach((div, index) => {
        const fila = Math.floor(index / 14);
        const col = index % 14;
        todosLosCubiculosDivs[`${fila}-${col}`] = div;
    });
    grid.querySelectorAll('.libro-lomo').forEach(lomo => todosLosLomos.push(lomo));

    const gestionarBusqueda = () => { /* ... */ };
    const gestionarFiltro = () => { /* ... */ };
    // (Pega aquí las funciones completas de gestionarBusqueda y gestionarFiltro)
    const gestionarBusquedaCompleta = () => {
        const termino = campoBusqueda.value.toLowerCase().trim();
        grid.classList.toggle('busqueda-activa', !!termino);
        todosLosLomos.forEach(lomo => {
            const cubiculoPadre = lomo.parentElement;
            let resalta = false;
            if (!cubiculoPadre.classList.contains('atenuado') && termino) {
                const titulo = lomo.dataset.titulo.toLowerCase();
                const autor = lomo.dataset.autor.toLowerCase();
                if (titulo.includes(termino) || autor.includes(termino)) resalta = true;
            }
            lomo.classList.toggle('resaltado', resalta);
        });
    };
    const gestionarFiltroCompleta = () => {
        const generoSel = filtroGenero.value;
        Object.values(todosLosCubiculosDivs).forEach(div => {
            div.classList.toggle('atenuado', generoSel !== 'todos' && div.dataset.genero !== generoSel);
        });
        gestionarBusquedaCompleta();
    };
    btnBuscar.addEventListener('click', gestionarBusquedaCompleta);
    campoBusqueda.addEventListener('keypress', e => { if (e.key === 'Enter') gestionarBusquedaCompleta(); });
    btnLimpiar.addEventListener('click', () => { campoBusqueda.value = ''; gestionarBusquedaCompleta(); });
    filtroGenero.addEventListener('change', gestionarFiltroCompleta);

    // --- LÓGICA MODALES ---
    // Modal Añadir Libro (la lógica interna no cambia, pero se activa con el estado 'esAdmin')
    btnOpenAdd.onclick = () => { modalAdd.style.display = "block"; };
    btnCloseAdd.onclick = () => { modalAdd.style.display = "none"; };
    modalAdd.onclick = (e) => { if (e.target == modalAdd) modalAdd.style.display = "none"; };
    // Poblar selector
    const layout = [[1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1]];
    selectCubiculo.innerHTML = '<option value="">-- Selecciona un cubículo --</option>'; 
    layout.forEach((fila, r) => { fila.forEach((celda, c) => { if (celda === 1) {
        const clave = `${r}-${c}`; const datosCubiculo = datosCubiculos[clave];
        const genero = datosCubiculo ? datosCubiculo.genero : "Vacío";
        const opcion = document.createElement('option'); opcion.value = clave; 
        opcion.textContent = `Fila ${r + 1}, Col ${c + 1} (${genero})`;
        selectCubiculo.appendChild(opcion);
    }});});
    // Submit del formulario (ahora envía la contraseña en el header)
    formAdd.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuevoLibro = { 
            titulo: document.getElementById('tituloInput').value, 
            autor: document.getElementById('autorInput').value, 
            clave_cubiculo: selectCubiculo.value 
        };
        try {
            const response = await fetch('/api/biblioteca', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': claveSecreta // <-- ENVIAMOS LA CONTRASEÑA
                },
                body: JSON.stringify(nuevoLibro)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error: ${response.status}`);
            }
            alert("¡Libro añadido con éxito!");
            location.reload();
        } catch (error) {
            alert(`No se pudo añadir el libro: ${error.message}`);
        }
    });

    // Modal Detalles (ahora muestra/oculta el botón Borrar)
    btnCloseDetails.onclick = () => { modalDetails.style.display = "none"; };
    modalDetails.onclick = (e) => { if (e.target == modalDetails) modalDetails.style.display = "none"; };
    grid.addEventListener('click', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo) {
            const idLibro = lomo.dataset.idLibro;
            const titulo = lomo.dataset.titulo;
            modalTitulo.textContent = titulo;
            modalAutor.textContent = lomo.dataset.autor;
            
            // --- LÓGICA DE VISIBILIDAD DEL BOTÓN BORRAR ---
            btnBorrar.style.display = esAdmin ? 'inline-block' : 'none';

            const termino = encodeURIComponent(titulo);
            btnBuscaLibre.href = `...`; // URL de BuscaLibre
            btnBorrar.onclick = async () => {
                if (confirm(`¿Seguro que quieres borrar "${titulo}"?`)) {
                    try {
                        const response = await fetch(`/api/libros/${idLibro}`, { 
                            method: 'DELETE',
                            headers: {
                                'X-API-KEY': claveSecreta // <-- ENVIAMOS LA CONTRASEÑA
                            }
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || `Error: ${response.status}`);
                        }
                        alert("¡Libro borrado con éxito!");
                        location.reload();
                    } catch (error) {
                        alert(`No se pudo borrar el libro: ${error.message}`);
                    }
                }
            };
            modalDetails.style.display = "block";
        }
    });
}

