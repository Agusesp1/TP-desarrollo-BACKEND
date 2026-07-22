const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('¡El servidor de Express está funcionando correctamente!');
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor de Express corriendo en el puerto ${PORT}`);
});
