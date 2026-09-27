const fs = require('fs');
const path = require('path');

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
  'exito': 'éxito',
  'Escanner': 'Escáner',
  'escanner': 'escáner',
  'Escaner': 'Escáner',
  'escaner': 'escáner',
  'Huerfanos': 'Huérfanos',
  'huerfanos': 'huérfanos',
  'Huerfano': 'Huérfano',
  'huerfano': 'huérfano',
  'Auditoria': 'Auditoría',
  'auditoria': 'auditoría'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      let modified = content;
      for (const [bad, good] of Object.entries(dict)) {
        const regex = new RegExp(`\\b${bad}\\b`, 'g');
        modified = modified.replace(regex, good);
      }
      if (content !== modified) {
        fs.writeFileSync(p, modified, 'utf8');
        console.log(`Spelling fixed in ${p}`);
      }
    }
  }
}

processDir('src');
