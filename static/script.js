document.addEventListener('DOMContentLoaded', iniciarApp);

// --- VARIABLES GLOBALES ---
let esAdmin = false;
let claveSecreta = null;

// --- FUNCIÓN PRINCIPAL ---
async function iniciarApp() {
    console.log("Iniciando aplicación...");
    try {
        const urlApi = '/api/biblioteca?timestamp=' + new Date().getTime();
        const response = await fetch(urlApi);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        
        const datosCubiculos = await response.json();
        console.log("Datos recibidos.");
        
        construirVista(datosCubiculos);

    } catch (error) {
        console.error("Fallo al obtener datos:", error);
        document.getElementById('bibliotecaGrid').innerHTML = '<p style="color: red;">Error al cargar la biblioteca.</p>';
    }
}

// --- CONSTRUCCIÓN DE LA VISTA Y LÓGICA DE EVENTOS ---
function construirVista(datosCubiculos) {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const grid = document.getElementById('bibliotecaGrid');
    const tooltip = document.getElementById('globalTooltip');
    const tooltipTitulo = tooltip.querySelector('.tooltip-titulo');
    const tooltipAutor = tooltip.querySelector('.tooltip-autor');
    const campoBusqueda = document.getElementById('campoBusqueda');
    const btnBuscar = document.getElementById('botonBuscar');
    const btnLimpiar = document.getElementById('botonLimpiarBusqueda');
    const filtroGenero = document.getElementById('filtroGenero');
    const btnOpenAdd = document.getElementById('abrirModalBtn');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
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

    const todosLosLomos = [];
    const todosLosCubiculosDivs = {};
    const layout = [
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],[1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,0,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    // --- FUNCIONES AUXILIARES ---
    const colores = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];
    const getRandomColor = () => colores[Math.floor(Math.random() * colores.length)];
    const truncarTitulo = (titulo, max = 22) => titulo.length > max ? titulo.substring(0, max - 3) + "..." : titulo;

    // --- INICIALIZACIÓN DE LA VISTA ---
    btnOpenAdd.style.display = 'none'; // Ocultar botón Admin por defecto

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
                } else { cubiculoDiv.classList.add('vacio'); }
            } else { cubiculoDiv.classList.add('vacio'); }
            grid.appendChild(cubiculoDiv);
        });
    });

    // --- LÓGICA DE EVENTOS ---
    const gestionarBusqueda = () => {
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
    
    const gestionarFiltro = () => {
        const generoSel = filtroGenero.value;
        Object.values(todosLosCubiculosDivs).forEach(div => {
            div.classList.toggle('atenuado', generoSel !== 'todos' && div.dataset.genero !== generoSel);
        });
        gestionarBusqueda();
    };
    
    btnBuscar.addEventListener('click', gestionarBusqueda);
    campoBusqueda.addEventListener('keypress', e => { if (e.key === 'Enter') gestionarBusqueda(); });
    btnLimpiar.addEventListener('click', () => { campoBusqueda.value = ''; gestionarBusqueda(); });
    filtroGenero.addEventListener('change', gestionarFiltro);
    
    // Tooltip (solo para no-táctiles)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) {
        let currentLomoHover = null;
        grid.addEventListener('mouseover', e => {
            const lomo = e.target.closest('.libro-lomo');
            if (lomo && !lomo.parentElement.classList.contains('atenuado') && modalDetails.style.display !== 'block') {
                currentLomoHover = lomo;
                tooltipTitulo.textContent = lomo.dataset.titulo;
                tooltipAutor.textContent = lomo.dataset.autor;
                const lomoRect = lomo.getBoundingClientRect();
                tooltip.style.display = 'block';
                const tipRect = tooltip.getBoundingClientRect();
                let top = lomoRect.top - tipRect.height - 5;
                if (top < 5) top = lomoRect.bottom + 5;
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
    }

    // Modal Añadir Libro
    btnOpenAdd.onclick = () => {
        selectCubiculo.innerHTML = '<option value="">-- Selecciona un cubículo --</option>'; 
        layout.forEach((fila, r) => { fila.forEach((celda, c) => { if (celda === 1) {
            const clave = `${r}-${c}`; const datosCubiculo = datosCubiculos[clave];
            const genero = datosCubiculo ? datosCubiculo.genero : "Vacío";
            const opcion = document.createElement('option'); opcion.value = clave; 
            opcion.textContent = `Fila ${r + 1}, Col ${c + 1} (${genero})`;
            selectCubiculo.appendChild(opcion);
        }});});
        modalAdd.style.display = "block";
    };
    btnCloseAdd.onclick = () => { modalAdd.style.display = "none"; };
    modalAdd.onclick = (e) => { if (e.target == modalAdd) modalAdd.style.display = "none"; };
    formAdd.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuevoLibro = { 
            titulo: document.getElementById('tituloInput').value, 
            autor: document.getElementById('autorInput').value, 
            clave_cubiculo: selectCubiculo.value 
        };
        if (!nuevoLibro.clave_cubiculo) { alert("Por favor, selecciona una ubicación."); return; }
        try {
            const response = await fetch('/api/biblioteca', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-API-KEY': claveSecreta },
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

    // Modal Detalles y Borrar Libro
    btnCloseDetails.onclick = () => { modalDetails.style.display = "none"; };
    modalDetails.onclick = (e) => { if (e.target == modalDetails) modalDetails.style.display = "none"; };
    grid.addEventListener('click', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo && !lomo.parentElement.classList.contains('atenuado')) {
            const idLibro = lomo.dataset.idLibro;
            const titulo = lomo.dataset.titulo;
            modalTitulo.textContent = titulo;
            modalAutor.textContent = lomo.dataset.autor;
            
            btnBorrar.style.display = esAdmin ? 'inline-block' : 'none';

            const termino = encodeURIComponent(titulo);
            btnBuscaLibre.href = `https://www.buscalibre.com.ar/libros/search?q=${termino}&afiliado=d121bda5246c64620456`;
            
            btnBorrar.onclick = async () => {
                if (confirm(`¿Estás seguro de que quieres borrar "${titulo}"?`)) {
                    try {
                        const response = await fetch(`/api/libros/${idLibro}`, { 
                            method: 'DELETE',
                            headers: { 'X-API-KEY': claveSecreta }
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
