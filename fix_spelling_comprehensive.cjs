const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const dict = {
  'Suscripcion': 'Suscripción',
  'suscripcion': 'suscripción',
  'Informacion': 'Información',
  'informacion': 'información',
  'Configuracion': 'Configuración',
  'configuracion': 'configuración',
  'Comision': 'Comisión',
  'comision': 'comisión',
  'Boton': 'Botón',
  'boton': 'botón',
  'Seccion': 'Sección',
  'seccion': 'sección',
  'Accion': 'Acción',
  'accion': 'acción',
  'Atencion': 'Atención',
  'atencion': 'atención',
  'Opcion': 'Opción',
  'opcion': 'opción',
  'Conexion': 'Conexión',
  'conexion': 'conexión',
  'Atras': 'Atrás',
  'atras': 'atrás',
  'Estan': 'Están',
  'estan': 'están',
  'Tambien': 'También',
  'tambien': 'también',
  'Despues': 'Después',
  'despues': 'después',
  'Elegir': 'Elegir',
  'Mobil': 'Móvil',
  'mobil': 'móvil',
  'Nesecita': 'Necesita',
  'nesecita': 'necesita',
  'Botones': 'Botones',
  'elije': 'elige',
  'Elije': 'Elige',
  'Actulizar': 'Actualizar',
  'actulizar': 'actualizar',
  'Adminstrador': 'Administrador',
  'adminstrador': 'administrador',
  'Previsualizacion': 'Previsualización',
  'previsualizacion': 'previsualización',
  'Sincronizacion': 'Sincronización',
  'sincronizacion': 'sincronización',
  'Operacion': 'Operación',
  'operacion': 'operación',
  'Dinamicas': 'Dinámicas',
  'dinamicas': 'dinámicas',
  'Basicos': 'Básicos',
  'basicos': 'básicos',
  'Metodos': 'Métodos',
  'metodos': 'métodos',
  'Categoria': 'Categoría',
  'categoria': 'categoría',
  'Direccion': 'Dirección',
  'direccion': 'dirección',
  'Edicion': 'Edición',
  'edicion': 'edición',
  'Exito': 'Éxito',
  'exito': 'éxito'
};

let modified = content;
for (const [bad, good] of Object.entries(dict)) {
  const regex = new RegExp(`\\b${bad}\\b`, 'g');
  modified = modified.replace(regex, good);
}

if (content !== modified) {
  fs.writeFileSync('src/components/AdminPanel.tsx', modified, 'utf8');
  console.log('Spelling fixed in AdminPanel.tsx');
} else {
  console.log('No spelling errors found in AdminPanel.tsx');
}
