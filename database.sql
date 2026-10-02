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
  rol ENUM ('admin','usuario','profesor') DEFAULT 'usuario',
  estado BOOLEAN DEFAULT true
);

-- 4. Crear la tabla de sedes
CREATE TABLE IF NOT EXISTS sedes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(200) NOT NULL,
  ciudad VARCHAR(100) NOT NULL DEFAULT 'Córdoba',
  telefono VARCHAR(50),
  email VARCHAR(150),
  horario_apertura VARCHAR(100) NOT NULL DEFAULT 'Lunes a Viernes 07:00 a 23:00',
  capacidad INT DEFAULT 150,
  estado BOOLEAN DEFAULT true
);

-- 5. Crear la tabla de profesores
CREATE TABLE IF NOT EXISTS profesores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  telefono VARCHAR(50),
  especialidad VARCHAR(100) NOT NULL DEFAULT 'Musculación',
  turno ENUM ('Mañana','Tarde','Noche','Rotativo') DEFAULT 'Mañana',
  sede_id INT,
  estado BOOLEAN DEFAULT true,
  fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL
);

-- 6. Crear la tabla de actividades (idActividad, nombre, duracion, cupo)
CREATE TABLE IF NOT EXISTS actividades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  duracion INT NOT NULL DEFAULT 60,
  cupo INT NOT NULL DEFAULT 20,
  descripcion TEXT,
  estado BOOLEAN DEFAULT true
);

-- 7. Crear la tabla de turnos (horarioInicio, horaFin dependiente de actividad)
CREATE TABLE IF NOT EXISTS turnos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actividad_id INT NOT NULL,
  horarioInicio VARCHAR(10) NOT NULL,
  horaFin VARCHAR(10) NOT NULL,
  dia_semana ENUM ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo') NOT NULL DEFAULT 'Lunes',
  profesor_id INT,
  sede_id INT,
  estado BOOLEAN DEFAULT true,
  FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
  FOREIGN KEY (profesor_id) REFERENCES profesores(id) ON DELETE SET NULL,
  FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL
);

-- 8. Insertar administrador predeterminado si no existe (contraseña encriptada con bcrypt: 'adminfit')
INSERT INTO usuarios (nombre, apellido, dni, fecha_nacimiento, email, password, bio, categoria, rol, estado)
VALUES ('Administrador', 'GymFit', '00000001', '1990-01-01', 'administraciongymfit@gmail.com', '$2b$10$k75kWnm0MfOZ7CwLDkRlGuh5aB4O.AdAkJFdCajL2et3VCQhplzDG', 'Administrador general del sistema.', 'Premium', 'admin', true)
ON DUPLICATE KEY UPDATE rol = 'admin', password = '$2b$10$k75kWnm0MfOZ7CwLDkRlGuh5aB4O.AdAkJFdCajL2et3VCQhplzDG';

-- 9. Crear la tabla de precios programados de cuotas
CREATE TABLE IF NOT EXISTS precios_cuota (
  id INT AUTO_INCREMENT PRIMARY KEY,
  monto DECIMAL(10, 2) NOT NULL,
  fecha_desde DATE NOT NULL,
  descripcion VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Crear la tabla de cuotas de socios
CREATE TABLE IF NOT EXISTS cuotas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  numero_cuota INT NOT NULL,
  periodo VARCHAR(50) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_limite_pago DATE NOT NULL,
  estado ENUM ('pendiente', 'en demora', 'no pagado', 'pagado') DEFAULT 'pendiente',
  fecha_pago TIMESTAMP NULL,
  metodo_pago VARCHAR(50) NULL,
  comprobante VARCHAR(100) NULL,
  mp_payment_id VARCHAR(100) NULL,
  mp_status VARCHAR(50) NULL,
  mp_preference_id VARCHAR(100) NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 11. Insertar precio base inicial de cuota
INSERT INTO precios_cuota (monto, fecha_desde, descripcion, activo)
VALUES (18000.00, '2026-01-01', 'Tarifa general base FitApp 2026', true)
ON DUPLICATE KEY UPDATE monto = VALUES(monto);

