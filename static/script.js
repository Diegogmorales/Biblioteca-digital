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
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        const datosCubiculos = await response.json();
        console.log("Datos recibidos del backend.");
        construirVista(datosCubiculos);
    } catch (error) {
        console.error("Fallo al obtener datos de la biblioteca:", error);
        document.getElementById('bibliotecaGrid').innerHTML = '<p style="color: red; text-align: center;">Error al cargar la biblioteca.</p>';
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

    // 1. Poblar géneros y dibujar grid (sin cambios)
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
                        lomoDiv.dataset.idLibro = libro.id_libro; // <-- Guardar el ID del libro
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

    // 2. Lógica de eventos (Búsqueda, Filtro, Tooltip) - sin cambios funcionales
    // ... (toda la lógica de gestionarBusqueda, gestionarFiltro y el tooltip se mantiene igual)

    const gestionarBusqueda = () => {/* ... */};
    const gestionarFiltro = () => {/* ... */};
    btnBuscar.addEventListener('click', gestionarBusqueda);
    campoBusqueda.addEventListener('keypress', e => { if (e.key === 'Enter') gestionarBusqueda(); });
    btnLimpiar.addEventListener('click', () => { campoBusqueda.value = ''; gestionarBusqueda(); });
    filtroGenero.addEventListener('change', gestionarFiltro);
    let currentLomo = null;
    grid.addEventListener('mouseover', e => {/* ... */});
    grid.addEventListener('mouseout', e => {/* ... */});
    
    // 3. Llamar a las funciones para configurar los modales
    setupAddBookModal(datosCubiculos);
    setupDetailsModal();
}

// ==================================================================
// SECCIÓN MODALES (SEPARADOS PARA MAYOR CLARIDAD)
// ==================================================================

function setupAddBookModal(datosCubiculos) {
    const modal = document.getElementById('addBookModal');
    // ... (resto de las constantes)
    const abrirModalBtn = document.getElementById('abrirModalBtn');
    const cerrarModalBtn = document.getElementById('cerrarModalBtn');
    const cubiculoSelect = document.getElementById('cubiculoSelect');
    const addBookForm = document.getElementById('addBookForm');
    
    // ... (código para poblar el selector de cubículos, sin cambios)
    const layout = [
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
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
    
    abrirModalBtn.onclick = () => { modal.style.display = "block"; };
    cerrarModalBtn.onclick = () => { modal.style.display = "none"; };
    // Este listener ahora solo se aplica a este modal
    modal.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
    
    addBookForm.addEventListener('submit', async function(event) {
        // ... (código para enviar el formulario, sin cambios)
    });
}

function setupDetailsModal() {
    const grid = document.getElementById('bibliotecaGrid');
    const modal = document.getElementById('detailsModal');
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
        console.log(`Enviando petición para borrar libro con ID: ${idLibro}`);
        
        try {
            const response = await fetch(`/api/libros/${idLibro}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }

            alert("¡Libro borrado con éxito!");
            modal.style.display = "none";
            location.reload(); // Recargar la página para ver los cambios

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