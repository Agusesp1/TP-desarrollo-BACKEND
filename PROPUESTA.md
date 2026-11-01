# Propuesta TP DSW

## Grupo
### Integrantes
* 54890 - Anduaga, Morena
* 52221 - España, Agustín
* 54451 - Valvasoni, Máximo
* 53073 - Zuliani, Ignacio

### Repositorios
* [Repositorio Front-End](https://github.com/Agusesp1/TP-desarrollo-FRONTEND.git)
* [Repositorio Back-End](https://github.com/Agusesp1/TP-desarrollo-BACKEND.git)

## Tema
### Descripción
Nuestro proyecto es desarrollar un software para la gestión de un gimnasio, permitiendo tener usuarios diferenciados (socios, profesores y encargados/administradores) los cuales van a poder interactuar con el sistema, pudiendo asistir al gimnasio por turno administrado por el sistema, gestionar las cuotas y verificar su vencimiento, como así también controlar cada entidad de una sede siendo encargado y permitiéndole ver estadísticas y datos de la misma.

### Modelo

[Diagrama Entidad-Relacion](https://drive.google.com/file/d/1QYu9QZpMjx15KOmOkGyAGqJT4m06Hd4r/view?usp=sharing)


## Alcance Funcional 

### Alcance Mínimo

Regularidad:
|Req|Detalle|
|:-|:-|
|CRUD simple|1. CRUD Usuario<br>2. CRUD Sede<br>3. CRUD Actividad<br>4. CRUD Precios de Cuota (Tarifas)|
|CRUD dependiente|1. CRUD Profesor {depende de} CRUD Sede<br>2. CRUD Turno {depende de} CRUD Actividad y CRUD Sede|
|Listado<br>+<br>detalle|1. Listado de clientes/socios mostrando documento, nombre, correo, membresía, estado de cuenta y vencimiento de la cuota (filtros según membresía, estado o búsqueda) + vista de detalle del socio y sus cuotas<br>2. Listado de profesores mostrando nombre, DNI, especialidad, turno, contacto, sede asignada y estado de cuenta (filtros según especialidad, sede o búsqueda) + vista de detalle del profesor|
|CUU/Epic|1. Calcular precio de cuota a un usuario (según categoría de membresía y tarifa vigente)<br>2. Generar link de pago para la cuota / Registrar cobro de cuota|


Adicionales para Aprobación
|Req|Detalle|
|:-|:-|
|CRUD |1. CRUD Usuario<br>2. CRUD Sede<br>3. CRUD Actividad<br>4. CRUD Cuota<br>5. CRUD Reserva<br>6. CRUD Turno<br>7. CRUD Profesor<br>8. CRUD Precios de Cuota (Tarifas programadas)|
|CUU/Epic|1. Calcular precio de cuota a un usuario (según categoría de membresía y tarifas vigentes)<br>2. Generar link de pago para la cuota (integración con Mercado Pago)<br>3. Actualizar el estado del usuario (automático según regularidad de deuda y manual administrativo)<br>4. Registrar y confirmar pago de cuota online (vía Webhooks de Mercado Pago)<br>5. Registrar cobro y pago manual de cuota en caja (con emisión de comprobante)<br>6. Reservar y cancelar un turno (con validación de cupo máximo, verificación de cuota al día y liberación inmediata de cupo)|


### Alcance Adicional Voluntario

|Req|Detalle|
|:-|:-|
|Listados |1. Listado de sedes con información de contacto, horarios y capacidad<br>2. Listado de actividades mostrando Nombre, Días y Horarios, Sede Asignada, Profesor a Cargo, Duración, Cupo Máximo, Turnos Creados, Estado (filtros por sedes o profesor)<br>3. Listado de turnos/clases disponibles para reserva (vista para el socio con filtros por sede, fecha y cálculo de cupos disponibles en tiempo real)<br>4. Listado de "Mis Reservas" del socio (detalle de reservas activas con opción de cancelación)<br>5. Listado e historial de cuotas del socio (seguimiento de cuotas pendientes, demoradas o pagadas y descarga/visualización de recibos)<br>6. Listado general de cuotas y cobranzas de socios para administración (filtros por estado de cuota "Al Día", "Demorado", "Con Deuda", buscador y panel de resumen)<br>7. Listado de tarifas programadas e históricas de cuotas con fecha de vigencia<br>8. Listado de agenda de turnos y clases asignadas para el profesor<br>9. Panel de estadísticas generales del gimnasio (total de socios, profesores activos, sedes, actividades y turnos)|
|CUU/Epic|1. Generación automática de turnos de musculación por bloques horarios al dar de alta una sede<br>2. Reservar un turno (con validación de cupo máximo, verificación de cuota al día y prevención de solapamientos)<br>3. Cancelar reserva de turno (liberación inmediata de cupo)<br>4. Generación automática de cuotas mensuales (evaluando fecha de ingreso, período, categoría de socio y tarifas vigentes)<br>5. Programación de actualización de precios futuros de cuotas|
|Otros|1. Control de acceso por roles (Socio, Profesor, Administrador) y gestión de dispositivos de confianza (`trustedDevices`)<br>2. Envío de mail con token criptográfico para recuperar contraseña<br>3. Autenticación en dos pasos (2FA) mediante código de 6 dígitos enviado por email<br>4. Verificación de correo electrónico de cuenta de usuario mediante token<br>5. Formulario de contacto con envío de correo electrónico institucional<br>6. Botón interactivo de contacto directo por WhatsApp<br>7. Emisión y visualización de comprobantes y recibos digitales de pago<br>8. Encriptación segura de contraseñas con salteo (bcrypt)|
