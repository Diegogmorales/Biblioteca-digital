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
    btnLimpiar.addEventListener('click', () => { campoBusqueda.value = ''; gestionarBusqueda(); });
    filtroGenero.addEventListener('change', gestionarFiltro);

    let currentLomo = null;
    grid.addEventListener('mouseover', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo && !lomo.parentElement.classList.contains('atenuado')) {
            currentLomo = lomo;
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
        if (e.target.closest('.libro-lomo') === currentLomo) {
            tooltip.style.display = 'none';
        }
    });
    
    setupModal(datosCubiculos);
}

// Función para configurar todo lo relacionado con el Modal de "Añadir Libro"
function setupModal(datosCubiculos) {
    const modal = document.getElementById('addBookModal');
    const abrirModalBtn = document.getElementById('abrirModalBtn');
    const cerrarModalBtn = document.getElementById('cerrarModalBtn');
    const cubiculoSelect = document.getElementById('cubiculoSelect');
    const addBookForm = document.getElementById('addBookForm');
    
    if (!modal || !abrirModalBtn || !cerrarModalBtn || !cubiculoSelect || !addBookForm) {
        console.error("Faltan elementos del modal.");
        return;
    }

    // --- BLOQUE CORREGIDO ---
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
    // --- FIN DEL BLOQUE CORREGIDO ---


    abrirModalBtn.onclick = () => { modal.style.display = "block"; };
    cerrarModalBtn.onclick = () => { modal.style.display = "none"; };
    window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };
    
    addBookForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const titulo = document.getElementById('tituloInput').value;
        const autor = document.getElementById('autorInput').value;
        const claveCubiculo = document.getElementById('cubiculoSelect').value;

        if (!claveCubiculo) { alert("Por favor, selecciona una ubicación."); return; }

        const nuevoLibro = { titulo: titulo, autor: autor, clave_cubiculo: claveCubiculo };
        console.log("Enviando nuevo libro:", nuevoLibro);

        try {
            const response = await fetch('/api/biblioteca', { // Apunta a la ruta unificada
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(nuevoLibro),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error del servidor: ${response.status}`);
            }
            alert("¡Libro añadido con éxito!");
            modal.style.display = "none";
            location.reload();
        } catch (error) {
            console.error('Error al añadir libro:', error);
            alert(`No se pudo añadir el libro: ${error.message}`);
        }
    });
}