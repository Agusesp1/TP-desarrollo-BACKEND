-- 1. Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS tp_desarrollo_backend;

-- 2. Usar la base de datos
USE tp_desarrollo_backend;

-- 3. Crear la tabla de users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  birth_date DATE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  category ENUM ('Inicial','Medium','Premium') DEFAULT 'Inicial',
  role ENUM ('admin','user','teacher') DEFAULT 'user',
  status BOOLEAN DEFAULT true
);

-- 4. Crear la tabla de branches
CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Córdoba',
  phone VARCHAR(50),
  email VARCHAR(150),
  opening_hours VARCHAR(100) NOT NULL DEFAULT 'Lunes a Viernes 07:00 a 23:00',
  capacity INT DEFAULT 150,
  status BOOLEAN DEFAULT true
);

-- 5. Crear la tabla de teachers
CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  dni VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(50),
  specialty VARCHAR(100) NOT NULL DEFAULT 'Musculación',
  shift ENUM ('Mañana','Tarde','Noche','Rotativo') DEFAULT 'Mañana',
  branch_id INT,
  status BOOLEAN DEFAULT true,
  date_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 6. Crear la tabla de activities (idActividad, name, duration, capacity)
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  capacity INT NOT NULL DEFAULT 20,
  description TEXT,
  status BOOLEAN DEFAULT true
);

-- 7. Crear la tabla de shifts (startTime, endTime dependiente de activity)
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  startTime VARCHAR(10) NOT NULL,
  endTime VARCHAR(10) NOT NULL,
  dayOfWeek ENUM ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo') NOT NULL DEFAULT 'Lunes',
  teacher_id INT,
  branch_id INT,
  status BOOLEAN DEFAULT true,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 8. Insertar administrador predeterminado si no existe (contraseña encriptada con bcrypt: 'adminfit')
INSERT INTO users (name, lastname, dni, birth_date, email, password, bio, category, role, status)
VALUES ('Administrador', 'GymFit', '00000001', '1990-01-01', 'administraciongymfit@gmail.com', '$2b$10$k75kWnm0MfOZ7CwLDkRlGuh5aB4O.AdAkJFdCajL2et3VCQhplzDG', 'Administrador general del sistema.', 'Premium', 'admin', true)
ON DUPLICATE KEY UPDATE role = 'admin', password = '$2b$10$k75kWnm0MfOZ7CwLDkRlGuh5aB4O.AdAkJFdCajL2et3VCQhplzDG';

-- 9. Crear la tabla de prices programados de quotas
CREATE TABLE IF NOT EXISTS prices_quota (
  id INT AUTO_INCREMENT PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  description VARCHAR(255),
  active BOOLEAN DEFAULT true,
  date_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Crear la tabla de quotas de members
CREATE TABLE IF NOT EXISTS quotas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  numero_quota INT NOT NULL,
  periodo VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  date_emision DATE NOT NULL,
  date_vencimiento DATE NOT NULL,
  date_limite_payment DATE NOT NULL,
  status ENUM ('pendiente', 'en demora', 'no pagado', 'pagado') DEFAULT 'pendiente',
  date_payment TIMESTAMP NULL,
  metodo_payment VARCHAR(50) NULL,
  receipt VARCHAR(100) NULL,
  mp_payment_id VARCHAR(100) NULL,
  mp_status VARCHAR(50) NULL,
  mp_preference_id VARCHAR(100) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Insertar price base inicial de quota
INSERT INTO prices_quota (amount, start_date, description, active)
VALUES (18000.00, '2026-01-01', 'Tarifa general base FitApp 2026', true)
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

