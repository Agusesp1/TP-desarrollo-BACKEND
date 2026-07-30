-- 1. Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS tp_desarrollo_backend;

-- 2. Usar la base de datos
USE tp_desarrollo_backend;

-- 3. Crear la tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  categoria ENUM ('Inicial','Medium','Premium') DEFAULT 'Inicial',
  estado BOOLEAN DEFAULT true
);
