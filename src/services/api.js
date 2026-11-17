import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default {
  // Endpoints de Productos
  obtenerProductos() {
    return api.get('/productos');
  },
  crearProducto(producto) {
    return api.post('/productos', producto);
  },
  actualizarProducto(id, producto) {
    return api.put(`/productos/${id}`, producto);
  },
  eliminarProducto(id) {
    return api.delete(`/productos/${id}`);
  },

  // Endpoints de Ventas
  obtenerVentas() {
    return api.get('/ventas');
  },
  registrarVenta(datosVenta) {
    return api.post('/ventas', datosVenta);
  }
};