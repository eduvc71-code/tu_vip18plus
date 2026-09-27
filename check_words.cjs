const fs = require('fs');
const content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const regex = /\b(Suscripcion|Informacion|Configuracion|Comision|Boton|Seccion|Accion|Atencion|Opcion|Conexion|Atras|Estan|Tambien|Despues|Elegir|Mobil|Nesecita|Botones|elije|Elije|Actulizar|Adminstrador|Previsualizacion|Sincronizacion|Operacion|Dinamicas|Basicos|Metodos|Categoria|Direccion|Edicion|Exito|Escanner|escanner|Escaner|escaner|Huerfanos|Huerfano|Auditoria|Soporte|Cancel|Cancela|Cancelar|Aceptar|Terminos|Condiciones|Termino|Validacion|Opciones|Publicacion|Transicion|Rechazado|Aceptado|Exitoso|Correcto|Incorrecto|Automagicamente|Automaticamente|Obligatoria|Obligatorio|Descripcion|descripciones|Descripciones|Reacciones|reacciones|Exclusivo|exclusiva|Exclusiva|Confidencial|Transferencia)\b/ig;

const matches = new Set(content.match(regex));
console.log(Array.from(matches).join(', '));
