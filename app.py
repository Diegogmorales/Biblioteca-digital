import sqlite3
import os
import csv
import io # <-- NUEVO
from flask import Flask, jsonify, render_template, request, send_file
from flask_cors import CORS

app = Flask(__name__,
            static_folder=os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static'),
            template_folder=os.path.join(os.path.abspath(os.path.dirname(__file__)), 'templates'))
CORS(app)
DB_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), "biblioteca.db")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/biblioteca', methods=['GET', 'POST'])
def gestionar_biblioteca():
    if request.method == 'POST':
        datos_libro = request.get_json()
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
    
    if request.method == 'GET':
        conn = sqlite3.connect(DB_PATH)
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

@app.route('/api/libros/<int:id_libro>', methods=['DELETE'])
def delete_libro(id_libro):
    conn = sqlite3.connect(DB_PATH)
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

# Comentado para Render
# --- NUEVO ENDPOINT PARA DESCARGAR LA DB COMO CSV ---
@app.route('/api/descargar-csv')
def descargar_csv():
    print("--- Backend: Petición recibida para descargar CSV ---")
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Consulta para obtener todos los libros con su información completa
        query = """
            SELECT 
                c.fila + 1 as fila, 
                c.columna + 1 as columna,
                g.nombre as genero,
                l.titulo,
                l.autor
            FROM Libros l
            JOIN Cubiculos c ON l.id_cubiculo_fk = c.id_cubiculo
            JOIN Generos g ON c.id_genero_fk = g.id_genero
            ORDER BY c.fila, c.columna, l.posicion;
        """
        cursor.execute(query)
        libros = cursor.fetchall()

        # Usamos 'io.StringIO' para crear un "archivo" CSV en memoria, sin guardarlo en el disco del servidor
        output = io.StringIO()
        writer = csv.writer(output)

        # Escribir la cabecera
        writer.writerow(['fila', 'columna', 'genero', 'titulo', 'autor'])

        # Escribir los datos de cada libro
        for libro in libros:
            writer.writerow([
                libro['fila'],
                libro['columna'],
                libro['genero'],
                libro['titulo'],
                libro['autor']
            ])
        
        # Preparar la salida para la descarga
        output.seek(0) # Volver al principio del "archivo" en memoria

        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name='biblioteca_actualizada.csv'
        )

    except Exception as e:
        print(f"--- Backend: ERROR al generar el CSV: {e} ---")
        return jsonify({"error": "No se pudo generar el archivo CSV"}), 500
    finally:
        if conn:
            conn.close()
# if __name__ == '__main__':
#     app.run(debug=True, port=5000)

