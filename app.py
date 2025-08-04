import os
import sqlite3
from functools import wraps
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

# --- CONFIGURACIÓN ---
SECRET_KEY = os.environ.get('APP_SECRET_KEY', 'desarrollo') # 'desarrollo' es la pass para pruebas locales

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "biblioteca.db")

app = Flask(__name__,
            static_folder=os.path.join(BASE_DIR, 'static'),
            template_folder=os.path.join(BASE_DIR, 'templates'))
CORS(app)

# --- DECORADOR DE SEGURIDAD ---
def requiere_clave_secreta(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        clave_recibida = request.headers.get('X-API-KEY')
        if not clave_recibida or clave_recibida != SECRET_KEY:
            return jsonify({"error": "No autorizado"}), 401
        return f(*args, **kwargs)
    return decorador

# --- RUTAS PÚBLICAS (NO REQUIEREN CONTRASEÑA) ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/biblioteca', methods=['GET'])
def get_biblioteca():
    # ... (La lógica GET se mueve aquí, separada del POST)
    conn = sqlite3.connect(DB_PATH)
    # ... (el resto del código para obtener y devolver la biblioteca)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    query = "SELECT l.id_libro, c.fila, c.columna, g.nombre as genero, l.titulo, l.autor FROM Libros l JOIN Cubiculos c ON l.id_cubiculo_fk = c.id_cubiculo JOIN Generos g ON c.id_genero_fk = g.id_genero ORDER BY c.fila, c.columna, l.posicion;"
    cursor.execute(query)
    todos_los_libros = cursor.fetchall()
    conn.close()
    datos_para_frontend = {}
    for libro in todos_los_libros:
        clave = f"{libro['fila']}-{libro['columna']}"
        if clave not in datos_para_frontend:
            datos_para_frontend[clave] = {"genero": libro['genero'], "libros": []}
        datos_para_frontend[clave]['libros'].append({"id_libro": libro['id_libro'], "titulo": libro['titulo'], "autor": libro['autor']})
    return jsonify(datos_para_frontend)

# --- RUTAS PRIVADAS (REQUIEREN CONTRASEÑA) ---
@app.route('/api/biblioteca', methods=['POST'])
@requiere_clave_secreta # <-- ¡AQUÍ ESTÁ LA MAGIA!
def add_libro():
    # ... (la lógica POST que ya teníamos)
    datos_libro = request.get_json()
    # ... (el resto del código para añadir un libro)
    titulo = datos_libro.get('titulo')
    clave_cubiculo = datos_libro.get('clave_cubiculo')
    if not titulo or not clave_cubiculo: return jsonify({"error": "Faltan datos"}), 400
    try:
        fila, columna = map(int, clave_cubiculo.split('-'))
    except (ValueError, TypeError):
        return jsonify({"error": "Clave de cubículo inválida"}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id_cubiculo FROM Cubiculos WHERE fila = ? AND columna = ?", (fila, columna))
        resultado = cursor.fetchone()
        if not resultado:
            conn.close()
            return jsonify({"error": "Cubículo no existe"}), 404
        id_cubiculo = resultado[0]
        cursor.execute("SELECT MAX(posicion) FROM Libros WHERE id_cubiculo_fk = ?", (id_cubiculo,))
        max_posicion = cursor.fetchone()[0]
        nueva_posicion = (max_posicion or -1) + 1
        cursor.execute("INSERT INTO Libros (titulo, autor, id_cubiculo_fk, posicion) VALUES (?, ?, ?, ?)",
                       (titulo, datos_libro.get('autor', ''), id_cubiculo, nueva_posicion))
        conn.commit()
        return jsonify({"mensaje": "Libro añadido con éxito"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error interno al guardar: {e}"}), 500
    finally:
        conn.close()

@app.route('/api/libros/<int:id_libro>', methods=['DELETE'])
@requiere_clave_secreta # <-- ¡Y AQUÍ TAMBIÉN!
def delete_libro(id_libro):
    # ... (la lógica DELETE que ya teníamos)
    conn = sqlite3.connect(DB_PATH)
    # ... (el resto del código para borrar un libro)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Libros WHERE id_libro = ?", (id_libro,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Libro no encontrado"}), 404
        return jsonify({"mensaje": "Libro borrado con éxito"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Error interno al borrar: {e}"}), 500
    finally:
        conn.close()

# (Comentado para Render)
# if __name__ == '__main__':
#     app.run(debug=True, port=5000)
