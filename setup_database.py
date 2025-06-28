import sqlite3
import csv
import os

# --- CONFIGURACIÓN ---
CSV_FILE_NAME = "biblioteca.csv"
DB_NAME = "biblioteca.db"

def crear_base_de_datos():
    """Crea una base de datos limpia con la estructura de tablas correcta."""
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
        print(f"Antigua base de datos '{DB_NAME}' eliminada para empezar de cero.")

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    print("Creando nueva base de datos y tablas...")

    cursor.execute('''
        CREATE TABLE Generos (
            id_genero INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        )
    ''')
    cursor.execute('''
        CREATE TABLE Cubiculos (
            id_cubiculo INTEGER PRIMARY KEY AUTOINCREMENT,
            fila INTEGER NOT NULL,
            columna INTEGER NOT NULL,
            id_genero_fk INTEGER,
            FOREIGN KEY (id_genero_fk) REFERENCES Generos(id_genero),
            UNIQUE(fila, columna)
        )
    ''')
    cursor.execute('''
        CREATE TABLE Libros (
            id_libro INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            autor TEXT,
            id_cubiculo_fk INTEGER NOT NULL,
            posicion INTEGER,
            FOREIGN KEY (id_cubiculo_fk) REFERENCES Cubiculos(id_cubiculo)
        )
    ''')
    print("Tablas 'Generos', 'Cubiculos' y 'Libros' creadas con éxito.")
    conn.commit()
    conn.close()

def poblar_desde_csv():
    """Lee el archivo CSV y llena las tablas de la base de datos."""
    try:
        with open(CSV_FILE_NAME, mode='r', encoding='utf-8') as csv_file:
            csv_reader = csv.DictReader(csv_file)
            
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            
            print(f"Leyendo datos desde '{CSV_FILE_NAME}'...")
            
            generos_map = {}
            cubiculos_map = {}
            posicion_libro = {}

            for row in csv_reader:
                # Procesar Género
                genero_nombre = row['genero'].strip()
                if genero_nombre not in generos_map:
                    cursor.execute("INSERT INTO Generos (nombre) VALUES (?)", (genero_nombre,))
                    generos_map[genero_nombre] = cursor.lastrowid

                # Procesar Cubículo
                fila_idx = int(row['fila']) - 1
                col_idx = int(row['columna']) - 1
                clave_cubiculo = f"{fila_idx}-{col_idx}"
                
                if clave_cubiculo not in cubiculos_map:
                    id_genero = generos_map[genero_nombre]
                    cursor.execute("INSERT INTO Cubiculos (fila, columna, id_genero_fk) VALUES (?, ?, ?)", (fila_idx, col_idx, id_genero))
                    id_cubiculo = cursor.lastrowid
                    cubiculos_map[clave_cubiculo] = id_cubiculo
                    posicion_libro[clave_cubiculo] = 0
                
                # Procesar Libro
                id_cubiculo_actual = cubiculos_map[clave_cubiculo]
                titulo = row['titulo'].strip()
                autor = row['autor'].strip()
                pos = posicion_libro[clave_cubiculo]
                
                cursor.execute(
                    "INSERT INTO Libros (titulo, autor, id_cubiculo_fk, posicion) VALUES (?, ?, ?, ?)",
                    (titulo, autor, id_cubiculo_actual, pos)
                )
                posicion_libro[clave_cubiculo] += 1

            conn.commit()
            conn.close()
            print("\n¡Base de datos poblada con éxito desde el archivo CSV!")

    except FileNotFoundError:
        print(f"\nERROR: No se encontró el archivo '{CSV_FILE_NAME}'.")
        print("Asegúrate de que el archivo CSV esté en la misma carpeta y se llame exactamente así.")
    except KeyError as e:
        print(f"\nERROR: Falta una columna en tu archivo CSV o tiene un nombre incorrecto.")
        print(f"Asegúrate de que las columnas se llamen exactamente: fila, columna, genero, titulo, autor. Error en la clave: {e}")
    except Exception as e:
        print(f"\nHa ocurrido un error inesperado: {e}")

# --- PUNTO DE ENTRADA ---
if __name__ == "__main__":
    crear_base_de_datos()
    poblar_desde_csv()