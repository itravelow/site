// Único lugar donde se cambian datos de contacto y precios de referencia.
// Los precios son de referencia pública (oct 2026) hasta que haya tarifa de aliado confirmada.

export const WHATSAPP_NUMBER = ''; // Formato internacional sin "+", ej. "18095551234". Vacío = botón en modo "próximamente".
export const BRAND = 'iTravelow';
export const TAGLINE = 'Traslados y excursiones en Punta Cana, atendidos por WhatsApp en español.';

export function waLink(message: string): string {
  if (!WHATSAPP_NUMBER) return '#contacto';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const SERVICES = [
  {
    slug: 'traslados',
    name: 'Traslado aeropuerto ↔ hotel',
    from: 35,
    unit: 'por vehículo, hasta 4 personas',
    includes: ['Chofer esperándote con cartel con tu nombre', 'Vehículo privado con aire acondicionado', 'Seguimiento de tu vuelo si se retrasa'],
    excludes: ['Propina (opcional)'],
    time: '20 a 45 minutos según la zona del hotel',
    message: 'Hola, quiero cotizar un traslado del aeropuerto al hotel. Fecha: ___ · Personas: ___ · Hotel: ___',
  },
  {
    slug: 'buggies',
    name: 'Buggies en Macao',
    from: 50,
    unit: 'por persona',
    includes: ['Recogida en tu hotel', 'Ruta por caminos de tierra, playa Macao y cenote', 'Buggy doble (2 personas) o familiar (4)'],
    excludes: ['Protector para la cara (lleva un pañuelo)', 'Ropa que no te importe ensuciar'],
    time: '3 a 4 horas · salidas en la mañana y en la tarde',
    message: 'Hola, quiero reservar buggies en Macao. Fecha: ___ · Personas: ___ · Hotel: ___',
  },
  {
    slug: 'saona',
    name: 'Isla Saona, día completo',
    from: 69,
    unit: 'por persona',
    includes: ['Recogida en el hotel entre 7 y 8 a.m.', 'Catamarán o lancha, parada en la piscina natural', 'Almuerzo buffet y bebidas a bordo'],
    excludes: ['Fotos y recuerdos en la isla', 'Propinas'],
    time: 'Unas 11 horas en total · regreso al atardecer',
    message: 'Hola, quiero reservar la excursión a Isla Saona. Fecha: ___ · Personas: ___ · Hotel: ___',
  },
  {
    slug: 'coco-bongo',
    name: 'Coco Bongo + transporte',
    from: 90,
    unit: 'por persona, entrada regular',
    includes: ['Entrada al show (regular, Premium o Gold según elijas)', 'Transporte ida y vuelta desde tu hotel', 'Regreso hacia la 1:30 a.m.'],
    excludes: ['Mesas VIP (se cotizan aparte)', 'Solo mayores de 18 años'],
    time: 'Salida desde el hotel alrededor de las 9 p.m.',
    message: 'Hola, quiero entradas para Coco Bongo con transporte. Fecha: ___ · Personas: ___ · Hotel: ___',
  },
];

export const FAQ = [
  {
    q: '¿Cuánto cuesta el taxi del aeropuerto de Punta Cana a Bávaro?',
    a: 'El taxi oficial del aeropuerto tiene tarifa fija por hotel: la mayoría de Bávaro está entre 20 y 40 USD por vehículo. Un traslado privado reservado con nosotros cuesta desde 35 USD, con chofer esperándote con tu nombre y confirmación por escrito antes de viajar.',
  },
  {
    q: '¿Funciona Uber en Punta Cana?',
    a: 'Sí, pero en el aeropuerto los conductores de Uber no pueden recogerte en la terminal y suele haber esperas. Si llegas de noche o con niños, un traslado reservado te evita el problema.',
  },
  {
    q: '¿Cómo se paga?',
    a: 'Tú no nos pagas por adelantado a nosotros. Confirmamos tu reserva por escrito y el operador local te cobra el día del servicio, o por enlace de pago si lo prefieres. Siempre sabes el precio antes de decir que sí.',
  },
  {
    q: '¿Puedo cancelar?',
    a: 'Sí. Cancelación gratuita hasta 24 horas antes en todos los servicios. Si el operador cancela por clima, se devuelve el 100 %.',
  },
  {
    q: '¿Quién presta el servicio?',
    a: 'Operadores locales con licencia de turismo en República Dominicana, con los que trabajamos como aliados. Nosotros te atendemos en español antes, durante y después; ellos ponen los vehículos, los barcos y los guías.',
  },
];
