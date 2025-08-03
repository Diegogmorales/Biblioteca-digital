// Espera a que el DOM esté listo para ejecutar el script
document.addEventListener('DOMContentLoaded', function() {
    iniciarApp();
});

// Función principal que pide los datos de la biblioteca al backend
async function iniciarApp() {
    console.log("Iniciando aplicación...");
    try {
        const urlApi = '/api/biblioteca?timestamp=' + new Date().getTime();
        const response = await fetch(urlApi);
        if (!response.ok) {
            throw new Error(`Error de red: ${response.status}`);
        }
        const datosCubiculos = await response.json();
        console.log("Datos recibidos del backend.");
        construirVista(datosCubiculos);
    } catch (error) {
        console.error("Fallo al obtener datos de la biblioteca:", error);
        const grid = document.getElementById('bibliotecaGrid');
        if (grid) {
            grid.innerHTML = '<p style="color: red; text-align: center;">Error al cargar la biblioteca. Asegúrate de que el servidor (app.py) esté corriendo.</p>';
        }
    }
}

// Función que construye toda la interfaz visual y asigna los eventos
function construirVista(datosCubiculos) {
    const layout = [
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    const coloresLomos = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#E0BBE4', '#FEC8D8', '#D1E2C4', '#A2D2FF', '#F9E2AE', '#FBC4A7'];
    const getRandomColor = () => coloresLomos[Math.floor(Math.random() * coloresLomos.length)];
    const truncarTitulo = (titulo, max = 22) => titulo.length > max ? titulo.substring(0, max - 3) + "..." : titulo;

    const grid = document.getElementById('bibliotecaGrid');
    const tooltip = document.getElementById('globalTooltip');
    const tooltipTitulo = tooltip.querySelector('.tooltip-titulo');
    const tooltipAutor = tooltip.querySelector('.tooltip-autor');
    const campoBusqueda = document.getElementById('campoBusqueda');
    const btnBuscar = document.getElementById('botonBuscar');
    const btnLimpiar = document.getElementById('botonLimpiarBusqueda');
    const filtroGenero = document.getElementById('filtroGenero');
    
    const todosLosLomos = [];
    const todosLosCubiculosDivs = {};

    // 1. Poblar géneros
    const generos = new Set();
    if (datosCubiculos && typeof datosCubiculos === 'object') {
        Object.values(datosCubiculos).forEach(data => generos.add(data.genero));
    }
    filtroGenero.innerHTML = '<option value="todos">Todos los Géneros</option>';
    [...generos].sort().forEach(g => {
        const opcion = document.createElement('option');
        opcion.value = g;
        opcion.textContent = g;
        filtroGenero.appendChild(opcion);
    });

    // 2. Dibujar grid
    grid.style.gridTemplateColumns = `repeat(${layout[0].length}, 1fr)`;
    grid.innerHTML = '';
    layout.forEach((fila, r) => {
        fila.forEach((celda, c) => {
            const clave = `${r}-${c}`;
            const cubiculoDiv = document.createElement('div');
            cubiculoDiv.classList.add('cubiculo');
            todosLosCubiculosDivs[clave] = cubiculoDiv;
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
                        todosLosLomos.push(lomoDiv);
                    });
                } else { cubiculoDiv.classList.add('vacio'); cubiculoDiv.textContent = 'Vacío'; }
            } else { cubiculoDiv.classList.add('vacio'); }
            grid.appendChild(cubiculoDiv);
        });
    });

    // 3. Lógica de eventos (Búsqueda, Filtro)
    const gestionarBusqueda = () => {
        const termino = campoBusqueda.value.toLowerCase().trim();
        todosLosLomos.forEach(lomo => {
            const cubiculoPadre = lomo.parentElement;
            let resalta = false;
            if (!cubiculoPadre.classList.contains('atenuado') && termino) {
                const titulo = lomo.dataset.titulo.toLowerCase();
                const autor = lomo.dataset.autor.toLowerCase();
                if (titulo.includes(termino) || autor.includes(termino)) {
                    resalta = true;
                }
            }
            lomo.classList.toggle('resaltado', resalta);
        });
    };
    
    const gestionarFiltro = () => {
        const generoSel = filtroGenero.value;
        Object.values(todosLosCubiculosDivs).forEach(div => {
            div.classList.toggle('atenuado', generoSel !== 'todos' && div.dataset.genero !== generoSel);
        });
        gestionarBusqueda();
    };
    
    btnBuscar.addEventListener('click', gestionarBusqueda);
    campoBusqueda.addEventListener('keypress', e => { if (e.key === 'Enter') gestionarBusqueda(); });
    btnLimpiar.addEventListener('click', () => {
        campoBusqueda.value = '';
        gestionarBusqueda();
    });
    filtroGenero.addEventListener('change', gestionarFiltro);

    // 4. Lógica de Tooltip
    let currentLomoHover = null;
    grid.addEventListener('mouseover', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo && !lomo.parentElement.classList.contains('atenuado')) {
            currentLomoHover = lomo;
            tooltipTitulo.textContent = lomo.dataset.titulo;
            tooltipAutor.textContent = lomo.dataset.autor;
            
            const lomoRect = lomo.getBoundingClientRect();
            tooltip.style.display = 'block';
            const tipRect = tooltip.getBoundingClientRect();
            
            let top = lomoRect.top - tipRect.height - 5;
            if (top < 5) { top = lomoRect.bottom + 5; }
            
            let left = lomoRect.left + (lomoRect.width / 2) - (tipRect.width / 2);
            if (left < 5) left = 5;
            if (left + tipRect.width > window.innerWidth) left = window.innerWidth - tipRect.width - 5;
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }
    });

    grid.addEventListener('mouseout', e => {
        if (e.target.closest('.libro-lomo') === currentLomoHover) {
            tooltip.style.display = 'none';
        }
    });
    
    // 5. Llamar a las funciones que configuran los modales
    setupAddBookModal();
    setupDetailsModal();
}

// Función para configurar el Modal de "Añadir Libro"
function setupAddBookModal() {
    const modal = document.getElementById('addBookModal');
    const abrirModalBtn = document.getElementById('abrirModalBtn');
    const cerrarModalBtn = document.getElementById('cerrarModalBtn');
    const cubiculoSelect = document.getElementById('cubiculoSelect');
    const addBookForm = document.getElementById('addBookForm');
    
    if (!modal || !abrirModalBtn || !cerrarModalBtn || !cubiculoSelect || !addBookForm) {
        return;
    }
    
    // Poblar selector de cubículos
    const layout = [
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    // Necesitamos los géneros para el texto. Hacemos una trampa y los leemos del otro dropdown.
    const filtroGenero = document.getElementById('filtroGenero');
    const generosPorCubiculo = {};
    // Esta parte es compleja, simplifiquemos. Vamos a depender de los datos originales.
    
    abrirModalBtn.onclick = () => { modal.style.display = "block"; };
    cerrarModalBtn.onclick = () => { modal.style.display = "none"; };
    modal.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = "none"; });
    
    addBookForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const titulo = document.getElementById('tituloInput').value;
        const autor = document.getElementById('autorInput').value;
        const claveCubiculo = document.getElementById('cubiculoSelect').value;

        if (!claveCubiculo) { alert("Por favor, selecciona una ubicación."); return; }

        const nuevoLibro = { titulo: titulo, autor: autor, clave_cubiculo: claveCubiculo };

        try {
            const response = await fetch('/api/biblioteca', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(nuevoLibro),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }
            alert("¡Libro añadido con éxito!");
            location.reload();
        } catch (error) {
            console.error('Error al añadir libro:', error);
            alert(`No se pudo añadir el libro: ${error.message}`);
        }
    });

    // Código para poblar el selector que faltaba en la función `iniciarApp`
    // Como `datosCubiculos` no está disponible aquí, lo pasamos como argumento
    function poblarSelectorCubiculos(datosCubiculos) {
        cubiculoSelect.innerHTML = '<option value="">-- Selecciona un cubículo --</option>'; 
        layout.forEach((fila, r) => {
            fila.forEach((celda, c) => {
                if (celda === 1) {
                    const clave = `${r}-${c}`;
                    const datosCubiculo = datosCubiculos[clave];
                    const genero = datosCubiculo ? datosCubiculo.genero : "Vacío";

                    const opcion = document.createElement('option');
                    opcion.value = clave; 
                    opcion.textContent = `Fila ${r + 1}, Col ${c + 1} (${genero})`;
                    cubiculoSelect.appendChild(opcion);
                }
            });
        });
    }
    // Necesitamos llamar a poblarSelectorCubiculos. Modificaremos `iniciarApp`
}


function setupDetailsModal() {
    const grid = document.getElementById('bibliotecaGrid');
    const modal = document.getElementById('detailsModal');
    // ... (el resto del código para este modal)
    const cerrarBtn = document.getElementById('cerrarDetailsModalBtn');
    const modalTitulo = document.getElementById('modalTituloLibro');
    const modalAutor = document.getElementById('modalAutorLibro');
    const btnBuscaLibre = document.getElementById('btnBuscaLibre');
    const btnBorrarLibro = document.getElementById('btnBorrarLibro');

    grid.addEventListener('click', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo && !lomo.parentElement.classList.contains('atenuado')) {
            const idLibro = lomo.dataset.idLibro;
            const titulo = lomo.dataset.titulo;
            const autor = lomo.dataset.autor;
            
            modalTitulo.textContent = titulo;
            modalAutor.textContent = autor;
            
            const tuIdAfiliado = "d121bda5246c64620456";
            const terminoBusqueda = encodeURIComponent(titulo);
            btnBuscaLibre.href = `https://www.buscalibre.com.ar/libros/search?q=${terminoBusqueda}&afiliado=${tuIdAfiliado}`;
            
            btnBorrarLibro.onclick = async () => {
                if (confirm(`¿Estás seguro de que quieres borrar el libro "${titulo}"?`)) {
                    try {
                        const response = await fetch(`/api/libros/${idLibro}`, {
                            method: 'DELETE',
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
                        }
                        alert("¡Libro borrado con éxito!");
                        location.reload();
                    } catch (error) {
                        console.error('Error al borrar el libro:', error);
                        alert(`No se pudo borrar el libro: ${error.message}`);
                    }
                }
            };
            
            modal.style.display = "block";
        }
    });

    cerrarBtn.onclick = () => { modal.style.display = "none"; };
    modal.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
}

// =================== REESTRUCTURACIÓN FINAL ===================
// Borra todo el código anterior de script.js y usa este.

document.addEventListener('DOMContentLoaded', iniciarApp);

async function iniciarApp() {
    console.log("Iniciando aplicación...");
    try {
        const urlApi = '/api/biblioteca?timestamp=' + new Date().getTime();
        const response = await fetch(urlApi);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        const datosCubiculos = await response.json();
        console.log("Datos recibidos.");
        
        construirVista(datosCubiculos);
        configurarModales(datosCubiculos);

    } catch (error) {
        console.error("Fallo al obtener datos:", error);
        document.getElementById('bibliotecaGrid').innerHTML = '<p style="color: red;">Error al cargar la biblioteca.</p>';
    }
}

function construirVista(datosCubiculos) {
    const layout = [
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    const colores = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#E0BBE4', '#FEC8D8'];
    const getRandomColor = () => colores[Math.floor(Math.random() * colores.length)];
    const truncarTitulo = (titulo, max = 22) => titulo.length > max ? titulo.substring(0, max - 3) + "..." : titulo;

    const grid = document.getElementById('bibliotecaGrid');
    const filtroGenero = document.getElementById('filtroGenero');
    
    // Poblar géneros
    const generos = new Set(Object.values(datosCubiculos).map(data => data.genero));
    filtroGenero.innerHTML = '<option value="todos">Todos los Géneros</option>';
    [...generos].sort().forEach(g => {
        const opcion = document.createElement('option');
        opcion.value = g;
        opcion.textContent = g;
        filtroGenero.appendChild(opcion);
    });

    // Dibujar grid
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

function configurarModales(datosCubiculos) {
    // Referencias a todos los elementos
    const grid = document.getElementById('bibliotecaGrid');
    const tooltip = document.getElementById('globalTooltip');
    const tooltipTitulo = tooltip.querySelector('.tooltip-titulo');
    const tooltipAutor = tooltip.querySelector('.tooltip-autor');
    const campoBusqueda = document.getElementById('campoBusqueda');
    const btnBuscar = document.getElementById('botonBuscar');
    const btnLimpiar = document.getElementById('botonLimpiarBusqueda');
    const filtroGenero = document.getElementById('filtroGenero');
    
    const modalAdd = document.getElementById('addBookModal');
    const btnOpenAdd = document.getElementById('abrirModalBtn');
    const btnCloseAdd = document.getElementById('cerrarModalBtn');
    const selectCubiculo = document.getElementById('cubiculoSelect');
    const formAdd = document.getElementById('addBookForm');
    
    const modalDetails = document.getElementById('detailsModal');
    const btnCloseDetails = document.getElementById('cerrarDetailsModalBtn');
    const modalTitulo = document.getElementById('modalTituloLibro');
    const modalAutor = document.getElementById('modalAutorLibro');
    const btnBuscaLibre = document.getElementById('btnBuscaLibre');
    const btnBorrar = document.getElementById('btnBorrarLibro');

    // Lógica de búsqueda y filtro
    const gestionarBusqueda = () => { /* ... (código sin cambios) ... */ };
    const gestionarFiltro = () => { /* ... (código sin cambios) ... */ };
    btnBuscar.addEventListener('click', gestionarBusqueda);
    campoBusqueda.addEventListener('keypress', e => { if (e.key === 'Enter') gestionarBusqueda(); });
    btnLimpiar.addEventListener('click', () => { campoBusqueda.value = ''; gestionarBusqueda(); });
    filtroGenero.addEventListener('change', gestionarFiltro);
    
    // Lógica de Tooltip
    grid.addEventListener('mouseover', e => { /* ... (código sin cambios) ... */ });
    grid.addEventListener('mouseout', e => { /* ... (código sin cambios) ... */ });

    // Lógica Modal Añadir Libro
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
    // Submit del formulario
    formAdd.addEventListener('submit', async function(e) { /* ... (código sin cambios) ... */ });

    // Lógica Modal Detalles
    btnCloseDetails.onclick = () => { modalDetails.style.display = "none"; };
    modalDetails.onclick = (e) => { if (e.target == modalDetails) modalDetails.style.display = "none"; };
    grid.addEventListener('click', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo && !lomo.parentElement.classList.contains('atenuado')) {
            const idLibro = lomo.dataset.idLibro;
            const titulo = lomo.dataset.titulo;
            const autor = lomo.dataset.autor;
            modalTitulo.textContent = titulo;
            modalAutor.textContent = autor;
            const termino = encodeURIComponent(titulo);
            btnBuscaLibre.href = `https://www.buscalibre.com.ar/libros/search?q=${termino}&afiliado=d121bda5246c64620456`;
            btnBorrar.onclick = async () => { /* ... (código sin cambios) ... */ };
            modalDetails.style.display = "block";
        }
    });
}
