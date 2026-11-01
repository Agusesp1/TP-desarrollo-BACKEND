# GymFit / FitApp - Backend API (TP Desarrollo de Software)

Servidor Backend y API RESTful para el sistema de gestión de gimnasios **FitApp**, desarrollado en **Node.js** con **Express 5**, **Sequelize ORM** y base de datos relacional **MySQL**.

---

## 👥 Integrantes del Grupo

* **54890** - Anduaga, Morena
* **52221** - España, Agustín
* **54451** - Valvasoni, Máximo
* **53073** - Zuliani, Ignacio

### Repositorios Relacionados
* **Backend:** [https://github.com/Agusesp1/TP-desarrollo-BACKEND](https://github.com/Agusesp1/TP-desarrollo-BACKEND)
* **Frontend:** [https://github.com/Agusesp1/TP-desarrollo-FRONTEND](https://github.com/Agusesp1/TP-desarrollo-FRONTEND)
* **Propuesta del TP:** [PROPUESTA.md](./PROPUESTA.md)

---

## 🛠️ Tecnologías y Arquitectura en Capas

* **Entorno de Ejecución:** Node.js (JavaScript CommonJS)
* **Framework Web:** Express v5
* **Base de Datos:** MySQL (`mysql2`)
* **ORM (Object-Relational Mapping):** Sequelize v6
* **Seguridad:** Encriptación de contraseñas con `bcryptjs`, tokens criptográficos (`crypto`), 2FA por correo y CORS configurado.
* **Pasarela de Pagos:** Integración con **Mercado Pago SDK** (`mercadopago`).
* **Estructura en Capas (`src/`):**
  * `src/config/`: Conexión a MySQL mediante Sequelize (`db.js`) y carga inicial automática de datos de prueba (`seed.js`).
  * `src/models/`: Definición de modelos y relaciones ORM (`User`, `Branch`, `Teacher`, `Activity`, `Shift`, `Reservation`, `Quota`, `PriceCuota`).
  * `src/middlewares/`: Validaciones de entrada de datos y control de errores (`auth`, `user`, `teacher`, `activity`, `shift`, `email`).
  * `src/controllers/`: Lógica de control de peticiones y respuestas HTTP estandarizadas.
  * `src/services/`: Servicios de negocio reutilizables (`quota.service.js`, `email.service.js`).
  * `src/routes/`: Definición de endpoints RESTful bajo el prefijo `/api`.

---

## 📋 Requisitos Previos

* **Node.js** v18 o superior instalado ([Descargar Node.js](https://nodejs.org/))
* **MySQL Server** (v8.0+ o XAMPP / MySQL Workbench / contenedor Docker) en ejecución

---

## 🚀 Instrucciones de Instalación y Ejecución

Sigue estos pasos para instalar y ejecutar el backend desde cero:

### 1. Clonar el repositorio
```bash
git clone https://github.com/Agusesp1/TP-desarrollo-BACKEND.git
cd TP-desarrollo-BACKEND
```

### 2. Instalar las dependencias
```bash
npm install
```

### 3. Crear la Base de Datos en MySQL
Abre tu cliente MySQL (Workbench, phpMyAdmin o terminal) y ejecuta:

```sql
CREATE DATABASE IF NOT EXISTS tp_desarrollo_backend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
*(Nota: No necesitas crear las tablas manualmente; **Sequelize** las sincronizará automáticamente al iniciar el servidor y el script `seed.js` poblará las sedes, profesores, actividades, turnos, tarifas y el usuario administrador inicial).*

### 4. Configurar las variables de entorno
Copia el archivo `.env.example` a `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita el archivo `.env` con las credenciales de tu base de datos MySQL local:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=tp_desarrollo_backend
DB_PORT=3306

# Credenciales iniciales de Administrador
ADMIN_EMAIL=administraciongymfit@gmail.com
ADMIN_PASSWORD=adminfit

# URLs para CORS y redirecciones
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Opcional: Mercado Pago y SMTP
MERCADOPAGO_ACCESS_TOKEN=
SMTP_USER=
SMTP_PASS=
```

### 5. Iniciar el servidor
```bash
npm start
```
El servidor quedará escuchando en: **`http://localhost:3000`**

---

## 🌐 Principales Endpoints de la API REST

| Recurso | Ruta Base | Operaciones Soportadas |
| :--- | :--- | :--- |
| **Autenticación** | `/api/auth` | `POST /registro`, `POST /login`, `POST /verify-2fa`, `POST /forgot-password`, `POST /reset-password`, `GET /verify-email/:token` |
| **Usuarios / Socios** | `/api/users` | `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PUT /:id/password` |
| **Administración** | `/api/admin` | `GET /estadisticas`, `GET /users`, `PATCH /users/:id/toggle-status` |
| **Sedes (Branches)** | `/api/branches` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/toggle-status` |
| **Profesores (Teachers)** | `/api/teachers` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/toggle-status` |
| **Actividades** | `/api/activities` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/toggle-status` |
| **Turnos (Shifts)** | `/api/shifts` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `PATCH /:id/toggle-status` |
| **Reservas** | `/api/reservations` | `GET /disponibles`, `GET /mis-reservas/:userId`, `POST /`, `PATCH /:id/cancelar` |
| **Cuotas y Tarifas** | `/api/quotas` | `GET /`, `GET /user/:userId`, `POST /:id/pagar`, `GET /prices`, `POST /prices`, `DELETE /prices/:id` |
| **Pagos (Mercado Pago)** | `/api/payments` | `POST /create-preference`, `POST /webhook` |
