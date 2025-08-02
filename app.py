import sqlite3
import os
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

print("--- INICIANDO app.py (VERSIÓN CORRECTA Y DEFINITIVA) ---")

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "biblioteca.db")

app = Flask(__name__,
            static_folder=os.path.join(BASE_DIR, 'static'),
            template_folder=os.path.join(BASE_DIR, 'templates'))
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/biblioteca', methods=['GET', 'POST'])
def gestionar_biblioteca():
    if request.method == 'POST':
        print("--- Backend: Petición POST recibida ---")
        datos_libro = request.get_json()
        titulo = datos_libro.get('titulo')
        clave_cubiculo = datos_libro.get('clave_cubiculo')
        
        if not titulo or not clave_cubiculo:
            return jsonify({"error": "Faltan datos"}), 400

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
            print(f"--- Backend: Libro '{titulo}' añadido con éxito. ---")
            return jsonify({"mensaje": "Libro añadido con éxito"}), 201
        except Exception as e:
            conn.rollback()
            print(f"--- Backend: ERROR al insertar: {e} ---")
            return jsonify({"error": "Error interno al guardar"}), 500
        finally:
            conn.close()

    if request.method == 'GET':
        print("--- Backend: Petición GET recibida ---")
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        query = """
            SELECT c.fila, c.columna, g.nombre as genero, l.titulo, l.autor
            FROM Libros l JOIN Cubiculos c ON l.id_cubiculo_fk = c.id_cubiculo JOIN Generos g ON c.id_genero_fk = g.id_genero
            ORDER BY c.fila, c.columna, l.posicion;
        """
        cursor.execute(query)
        todos_los_libros = cursor.fetchall()
        conn.close()
        
        datos_para_frontend = {}
        for libro in todos_los_libros:
            clave = f"{libro['fila']}-{libro['columna']}"
            if clave not in datos_para_frontend:
                datos_para_frontend[clave] = {"genero": libro['genero'], "libros": []}
            datos_para_frontend[clave]['libros'].append({"titulo": libro['titulo'], "autor": libro['autor']})
            
        return jsonify(datos_para_frontend)

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        print("ERROR: No se encuentra la base de datos. Ejecuta setup_database.py primero.")
    else:
        print("Iniciando servidor 'Todo en Uno' en http://127.0.0.1:5000")
        app.run(debug=True, port=5000)