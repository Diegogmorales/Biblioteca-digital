import sqlite3
import os
from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS

# --- CONFIGURACIÓN DE RUTAS A PRUEBA DE ERRORES ---
# Obtiene la ruta absoluta del directorio donde se encuentra este script (app.py)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Define la ruta absoluta al archivo de la base de datos
DB_PATH = os.path.join(BASE_DIR, "biblioteca.db")

app = Flask(__name__,
            static_folder=os.path.join(BASE_DIR, 'static'),
            template_folder=os.path.join(BASE_DIR, 'templates'))

CORS(app) 

# --- RUTA PARA SERVIR EL FRONTEND (index.html) ---
@app.route('/')
def index():
    return render_template('index.html')

# --- RUTA DE LA API PARA LOS DATOS ---
@app.route('/api/biblioteca')
def servir_biblioteca():
    print("--- Backend: Petición recibida en /api/biblioteca ---")
    print(f"--- Backend: Intentando leer la base de datos desde: {DB_PATH} ---")
    
    if not os.path.exists(DB_PATH):
        print("--- Backend: ERROR FATAL - El archivo de base de datos NO EXISTE en la ruta esperada.")
        return jsonify({"error": "El archivo de base de datos no se encuentra en el servidor."}), 500

    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = """
            SELECT c.fila, c.columna, g.nombre as genero, l.titulo, l.autor
            FROM Libros as l
            JOIN Cubiculos as c ON l.id_cubiculo_fk = c.id_cubiculo
            JOIN Generos as g ON c.id_genero_fk = g.id_genero
            ORDER BY c.fila, c.columna, l.posicion;
        """
        cursor.execute(query)
        todos_los_libros = cursor.fetchall()
        print(f"--- Backend: Consulta a DB exitosa. Se recuperaron {len(todos_los_libros)} libros. ---")
    except Exception as e:
        print(f"--- Backend: ERROR al consultar la base de datos: {e} ---")
        return jsonify({"error": "Error interno del servidor al consultar la base de datos"}), 500
    finally:
        if conn:
            conn.close()

    datos_para_frontend = {}
    for libro in todos_los_libros:
        clave_cubiculo = f"{libro['fila']}-{libro['columna']}"
        if clave_cubiculo not in datos_para_frontend:
            datos_para_frontend[clave_cubiculo] = {"genero": libro['genero'], "libros": []}
        datos_para_frontend[clave_cubiculo]['libros'].append({"titulo": libro['titulo'], "autor": libro['autor']})
        
    return jsonify(datos_para_frontend)

# --- PUNTO DE ENTRADA ---
#if __name__ == '__main__':
   # print("Iniciando servidor 'Todo en Uno' en http://127.0.0.1:5000")
    #app.run(debug=True, port=5000)