<script setup>
import { ref, onMounted } from 'vue';
import api from './services/api';

// Navegación por pestañas
const pestanaActiva = ref('productos');

// Estados de datos
const productos = ref([]);
const ventas = ref([]);
const mensaje = ref({ texto: '', tipo: '' });

// Formulario de Producto (Crear / Editar)
const editandoId = ref(null);
const formProducto = ref({
  nombre: '',
  categoria: '',
  precio: '',
  stock: ''
});

// Formulario de Venta
const formVenta = ref({
  productoId: '',
  cantidad: 1
});

const mostrarAlerta = (texto, tipo = 'exito') => {
  mensaje.value = { texto, tipo };
  setTimeout(() => {
    mensaje.value = { texto: '', tipo: '' };
  }, 4000);
};

// Cargar datos del backend
const cargarDatos = async () => {
  try {
    const [resProd, resVent] = await Promise.all([
      api.obtenerProductos(),
      api.obtenerVentas()
    ]);
    productos.value = resProd.data;
    ventas.value = resVent.data;
  } catch (error) {
    mostrarAlerta('Error al conectar con el servidor Spring Boot (puerto 8080)', 'error');
  }
};

// CRUD Productos
const guardarProducto = async () => {
  try {
    const payload = {
      nombre: formProducto.value.nombre,
      categoria: formProducto.value.categoria,
      precio: Number(formProducto.value.precio),
      stock: Number(formProducto.value.stock)
    };

    if (editandoId.value) {
      await api.actualizarProducto(editandoId.value, payload);
      mostrarAlerta('Producto actualizado correctamente');
    } else {
      await api.crearProducto(payload);
      mostrarAlerta('Producto registrado correctamente');
    }

    limpiarFormProducto();
    await cargarDatos();
  } catch (error) {
    mostrarAlerta('Revisa que todos los campos del producto sean válidos', 'error');
  }
};

const prepararEdicion = (prod) => {
  editandoId.value = prod.id;
  formProducto.value = {
    nombre: prod.nombre,
    categoria: prod.categoria || '',
    precio: prod.precio,
    stock: prod.stock
  };
};

const limpiarFormProducto = () => {
  editandoId.value = null;
  formProducto.value = { nombre: '', categoria: '', precio: '', stock: '' };
};

const borrarProducto = async (id) => {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
  try {
    await api.eliminarProducto(id);
    mostrarAlerta('Producto eliminado');
    await cargarDatos();
  } catch (error) {
    mostrarAlerta('No se puede eliminar un producto que ya tiene ventas registradas', 'error');
  }
};

// Registrar Venta
const procesarVenta = async () => {
  if (!formVenta.value.productoId) {
    mostrarAlerta('Selecciona un producto de la lista', 'error');
    return;
  }
  try {
    await api.registrarVenta({
      productoId: Number(formVenta.value.productoId),
      cantidad: Number(formVenta.value.cantidad)
    });
    mostrarAlerta('¡Venta registrada y stock actualizado!');
    formVenta.value = { productoId: '', cantidad: 1 };
    await cargarDatos();
  } catch (error) {
    const msgBackend = error.response?.data?.error || 'Error al procesar la venta';
    mostrarAlerta(msgBackend, 'error');
  }
};

onMounted(() => {
  cargarDatos();
});
</script>

<template>
  <div class="contenedor">
    <header class="encabezado">
      <h1>Sistema de Gestión de Tienda</h1>
      <p>Manuel de Jesús López Martínez</p>
    </header>

    <div v-if="mensaje.texto" :class="['alerta', mensaje.tipo]">
      {{ mensaje.texto }}
    </div>

    <nav class="tabs">
      <button
        :class="{ activo: pestanaActiva === 'productos' }"
        @click="pestanaActiva = 'productos'"
      >
        Inventario de Productos
      </button>
      <button
        :class="{ activo: pestanaActiva === 'ventas' }"
        @click="pestanaActiva = 'ventas'"
      >
        Punto de Venta e Historial
      </button>
    </nav>

    <!-- MÓDULO DE PRODUCTOS -->
    <section v-if="pestanaActiva === 'productos'" class="panel">
      <h2>{{ editandoId ? 'Editar Producto #' + editandoId : 'Nuevo Producto' }}</h2>
      <form @submit.prevent="guardarProducto" class="formulario">
        <input v-model="formProducto.nombre" type="text" placeholder="Nombre" required />
        <input v-model="formProducto.categoria" type="text" placeholder="Categoría" />
        <input v-model="formProducto.precio" type="number" step="0.01" min="0.01" placeholder="Precio" required />
        <input v-model="formProducto.stock" type="number" min="0" placeholder="Stock inicial" required />
        <div class="acciones-form">
          <button type="submit" class="btn-primario">
            {{ editandoId ? 'Actualizar' : 'Guardar Producto' }}
          </button>
          <button v-if="editandoId" type="button" @click="limpiarFormProducto" class="btn-secundario">
            Cancelar
          </button>
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in productos" :key="p.id">
            <td>{{ p.id }}</td>
            <td>{{ p.nombre }}</td>
            <td>{{ p.categoria || '-' }}</td>
            <td>${{ Number(p.precio).toFixed(2) }}</td>
            <td>
              <span :class="['badge', p.stock <= 3 ? 'bajo' : 'ok']">
                {{ p.stock }} uds.
              </span>
            </td>
            <td class="celda-acciones">
              <button @click="prepararEdicion(p)" class="btn-editar">Editar</button>
              <button @click="borrarProducto(p.id)" class="btn-borrar">Eliminar</button>
            </td>
          </tr>
          <tr v-if="productos.length === 0">
            <td colspan="6" class="vacio">No hay productos registrados.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- MÓDULO DE VENTAS -->
    <section v-if="pestanaActiva === 'ventas'" class="panel">
      <h2>Registrar Nueva Venta</h2>
      <form @submit.prevent="procesarVenta" class="formulario">
        <select v-model="formVenta.productoId" required>
          <option disabled value="">-- Selecciona un producto --</option>
          <option v-for="p in productos" :key="p.id" :value="p.id" :disabled="p.stock === 0">
            {{ p.nombre }} — ${{ Number(p.precio).toFixed(2) }} (Stock: {{ p.stock }})
          </option>
        </select>
        <input v-model="formVenta.cantidad" type="number" min="1" placeholder="Cantidad" required />
        <button type="submit" class="btn-primario">Confirmar Venta</button>
      </form>

      <h3>Historial de Ventas Realizadas</h3>
      <table>
        <thead>
          <tr>
            <th>ID Venta</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Total Cobrado</th>
            <th>Fecha y Hora</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in ventas" :key="v.id">
            <td>#{{ v.id }}</td>
            <td>{{ v.producto?.nombre }}</td>
            <td>{{ v.cantidad }}</td>
            <td><strong>${{ Number(v.total).toFixed(2) }}</strong></td>
            <td>{{ new Date(v.fechaVenta).toLocaleString() }}</td>
          </tr>
          <tr v-if="ventas.length === 0">
            <td colspan="5" class="vacio">Aún no se han registrado ventas.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style>
body {
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #f4f6f9;
  color: #1e293b;
  margin: 0;
  padding: 20px;
}
h2, p{
  color: #000;
}
.contenedor {
  max-width: 960px;
  margin: 0 auto;
}
.encabezado {
  text-align: center;
  margin-bottom: 24px;
}
.encabezado h1 {
  margin: 0;
  color: #0f172a;
}
.encabezado p {
  margin: 4px 0 0;
  color: #64748b;
}
.alerta {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-weight: 500;
}
.alerta.exito {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}
.alerta.error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background: #e2e8f0;
  color: #334155;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
}
.tabs button.activo {
  background: #2563eb;
  color: white;
}
.panel {
  background: white;
  padding: 24px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.formulario {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
input, select {
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
}
.acciones-form {
  display: flex;
  gap: 8px;
}
button {
  cursor: pointer;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  padding: 10px 14px;
}
.btn-primario {
  background: #2563eb;
  color: white;
  width: 100%;
}
.btn-secundario {
  background: #64748b;
  color: white;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
th {
  background: #f8fafc;
  color: #475569;
}
.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.badge.ok {
  background: #dcfce7;
  color: #166534;
}
.badge.bajo {
  background: #fef3c7;
  color: #92400e;
}
.celda-acciones {
  display: flex;
  gap: 6px;
}
.btn-editar {
  background: #f59e0b;
  color: white;
  padding: 6px 10px;
}
.btn-borrar {
  background: #ef4444;
  color: white;
  padding: 6px 10px;
}
.vacio {
  text-align: center;
  color: #94a3b8;
  padding: 20px;
}
</style>