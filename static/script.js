// Espera a que todo el HTML esté cargado para empezar.
document.addEventListener('DOMContentLoaded', function() {
    iniciarApp();
});

// La función principal que pide los datos y luego construye la vista.
async function iniciarApp() {
    console.log("Iniciando aplicación y pidiendo datos al backend...");
    try {
        // Pide los datos al servidor. La URL relativa '/api/biblioteca' funciona porque
        // el frontend y el backend ahora son servidos por el mismo origen (localhost:5000).
        // El 'cache buster' con timestamp fuerza al navegador a pedir datos nuevos siempre.
        const urlApi = '/api/biblioteca?timestamp=' + new Date().getTime();
        const response = await fetch(urlApi);

        if (!response.ok) {
            throw new Error(`Error de red o del servidor: ${response.status}`);
        }

        const datosCubiculosCompletos = await response.json();
        console.log("Datos recibidos del backend con éxito.");

        // Si los datos se reciben bien, llamamos a la función que dibuja todo.
        construirVista(datosCubiculosCompletos);

    } catch (error) {
        console.error("No se pudieron obtener los datos de la biblioteca:", error);
        const grid = document.getElementById('bibliotecaGrid');
        if (grid) {
            grid.innerHTML = '<p style="color: red; text-align: center;">Error al cargar la biblioteca. Asegúrate de que el servidor (app.py) esté corriendo.</p>';
        }
    }
}


function construirVista(datosCubiculos) {
    // El layout de la biblioteca.
    const layout = [
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,0,0,0,0,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,0,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const coloresLomos = ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#E0BBE4', '#FEC8D8', '#D1E2C4', '#A2D2FF', '#F9E2AE', '#FBC4A7'];
    function getRandomColor() { return coloresLomos[Math.floor(Math.random() * coloresLomos.length)]; }
    function truncarTitulo(titulo, max = 22) { return titulo.length > max ? titulo.substring(0, max - 3) + "..." : titulo; }

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

    // Poblar dropdown de géneros
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

    // Configurar y dibujar el grid
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
                } else {
                    cubiculoDiv.classList.add('vacio');
                }
            } else {
                cubiculoDiv.classList.add('vacio');
            }
            grid.appendChild(cubiculoDiv);
        });
    });

    // Lógica de Eventos
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
        gestionarBusqueda(); // Re-aplicar búsqueda al cambiar el filtro
    };
    
    btnBuscar.addEventListener('click', gestionarBusqueda);
    campoBusqueda.addEventListener('keypress', e => { if (e.key === 'Enter') gestionarBusqueda(); });
    btnLimpiar.addEventListener('click', () => {
        campoBusqueda.value = '';
        gestionarBusqueda();
    });
    filtroGenero.addEventListener('change', gestionarFiltro);

    // Lógica del Tooltip
    grid.addEventListener('mouseover', e => {
        const lomo = e.target.closest('.libro-lomo');
        if (lomo && !lomo.parentElement.classList.contains('atenuado')) {
            tooltipTitulo.textContent = lomo.dataset.titulo;
            tooltipAutor.textContent = lomo.dataset.autor;
            const lomoRect = lomo.getBoundingClientRect();
            tooltip.style.display = 'block';
            const tipRect = tooltip.getBoundingClientRect();
            let top = lomoRect.top - tipRect.height - 5;
            if (top < 0) { top = lomoRect.bottom + 5; }
            let left = lomoRect.left + (lomoRect.width / 2) - (tipRect.width / 2);
            if (left < 0) left = 5;
            if (left + tipRect.width > window.innerWidth) left = window.innerWidth - tipRect.width - 5;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }
    });

    grid.addEventListener('mouseout', e => {
        if (e.target.closest('.libro-lomo')) {
            tooltip.style.display = 'none';
        }
    });
}