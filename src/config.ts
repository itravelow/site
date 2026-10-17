// Único lugar donde se cambian datos de contacto, precios y pasarela de pago.
// Aquí van SOLO precios de venta al público. Los costos que pagamos a cada operador son
// privados y viven en el repositorio privado (docs/MODELO_NEGOCIO.md), nunca aquí.

export const BRAND = 'iTravelow';
export const TAGLINE = 'Traslados y excursiones en Punta Cana. Reservas y pagas aquí, te confirmamos por escrito.';
export const EMAIL = 'hola@itravelow.com';

// WhatsApp de asistencia (chat 24/7). Formato internacional sin "+", ej. "18095551234".
// Vacío = el botón de asistencia muestra el correo mientras se activa el número.
export const WHATSAPP_NUMBER = '';

export function waLink(message: string): string {
  if (!WHATSAPP_NUMBER) return '';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Pasarela de pago. 'pending' = aún no hay cuenta: la reserva se registra y el enlace de
// pago se envía a mano. Cuando exista cuenta se cambia a 'stripe' o 'paypal' y se despliega
// la función /api/checkout (ver docs/MODELO_NEGOCIO.md en el repo privado).
export const PAYMENTS: { provider: 'pending' | 'stripe' | 'paypal'; currency: 'USD' } = {
  provider: 'pending',
  currency: 'USD',
};

export type Unit = 'persona' | 'vehículo';

export interface ServiceOption {
  id: string;
  label: string;
  price: number; // USD por unidad
  unit: Unit;
  capacity?: number; // solo para unit = 'vehículo': personas por vehículo
}

export interface Service {
  slug: string;
  name: string;
  short: string; // una línea para el hero y los resúmenes
  image: string;
  alt: string;
  from: number; // precio más bajo entre las opciones, para "desde"
  fromUnit: string;
  time: string;
  includes: string[];
  excludes: string[];
  options: ServiceOption[];
  roundTrip?: boolean; // si aplica la opción "ida y vuelta" (x2)
  minPax: number;
  maxPax: number;
}

// Precios de referencia pública (oct 2026). Se ajustan cuando cada operador confirme tarifa.
export const SERVICES: Service[] = [
  {
    slug: 'traslados',
    name: 'Traslado aeropuerto ↔ hotel',
    short: 'Chofer con tu nombre en un cartel a la salida del aeropuerto.',
    image: '/img/traslado-480.webp',
    alt: 'Van blanca por la carretera de palmeras hacia un hotel de Bávaro',
    from: 35,
    fromUnit: 'por vehículo, un trayecto',
    time: '20 a 45 minutos según la zona del hotel',
    includes: ['Chofer esperándote con cartel con tu nombre', 'Vehículo privado con aire acondicionado', 'Seguimiento de tu vuelo si se retrasa'],
    excludes: ['Propina (opcional)'],
    options: [
      { id: 'auto', label: 'Vehículo privado, hasta 4 personas', price: 35, unit: 'vehículo', capacity: 4 },
      { id: 'van', label: 'Van privada, hasta 8 personas', price: 60, unit: 'vehículo', capacity: 8 },
    ],
    roundTrip: true,
    minPax: 1,
    maxPax: 16,
  },
  {
    slug: 'buggies',
    name: 'Buggies en Macao',
    short: 'Caminos de tierra, playa Macao y cenote, con recogida en el hotel.',
    image: '/img/buggies-480.webp',
    alt: 'Buggy levantando polvo rojo en un camino de tierra de Macao',
    from: 45,
    fromUnit: 'por persona',
    time: '3 a 4 horas · salidas en la mañana y en la tarde',
    includes: ['Recogida en tu hotel', 'Ruta por caminos de tierra, playa Macao y cenote', 'Buggy doble (2 personas) o familiar (4)'],
    excludes: ['Protector para la cara (lleva un pañuelo)', 'Ropa que no te importe ensuciar'],
    options: [
      { id: 'doble', label: 'Buggy doble (2 personas)', price: 50, unit: 'persona' },
      { id: 'familiar', label: 'Buggy familiar (4 personas)', price: 45, unit: 'persona' },
    ],
    minPax: 1,
    maxPax: 12,
  },
  {
    slug: 'saona',
    name: 'Isla Saona, día completo',
    short: 'Catamarán, piscina natural y almuerzo en la isla.',
    image: '/img/saona-480.webp',
    alt: 'Catamarán con vela rosa en la piscina natural de Isla Saona',
    from: 69,
    fromUnit: 'por persona',
    time: 'Unas 11 horas en total · regreso al atardecer',
    includes: ['Recogida en el hotel entre 7 y 8 a.m.', 'Catamarán o lancha, parada en la piscina natural', 'Almuerzo buffet y bebidas a bordo'],
    excludes: ['Fotos y recuerdos en la isla', 'Propinas'],
    options: [
      { id: 'adulto', label: 'Adulto', price: 69, unit: 'persona' },
      { id: 'nino', label: 'Niño de 3 a 11 años', price: 45, unit: 'persona' },
    ],
    minPax: 1,
    maxPax: 20,
  },
  {
    slug: 'coco-bongo',
    name: 'Coco Bongo + transporte',
    short: 'Entrada al show y transporte ida y vuelta desde tu hotel.',
    image: '/img/cocobongo-480.webp',
    alt: 'Escenario con luces rosas y turquesa y acróbatas sobre el público',
    from: 90,
    fromUnit: 'por persona, entrada regular',
    time: 'Salida desde el hotel alrededor de las 9 p.m. · regreso hacia la 1:30 a.m.',
    includes: ['Entrada al show', 'Transporte ida y vuelta desde tu hotel', 'Barra abierta nacional según el tipo de entrada'],
    excludes: ['Mesas VIP (se cotizan aparte)', 'Solo mayores de 18 años'],
    options: [
      { id: 'regular', label: 'Entrada regular', price: 90, unit: 'persona' },
      { id: 'gold', label: 'Entrada Gold Member', price: 140, unit: 'persona' },
    ],
    minPax: 1,
    maxPax: 20,
  },
];

// Descuento por combinar varios tours en una misma reserva (poco, pero visible).
export const COMBO_DISCOUNTS: Record<number, number> = { 2: 0.05, 3: 0.08, 4: 0.1 };

export interface Combo {
  slug: string;
  name: string;
  blurb: string;
  items: { service: string; option: string; roundTrip?: boolean }[];
}

// Combos sugeridos: prellenan el carrito; el descuento sale de COMBO_DISCOUNTS según cuántos tours lleve.
export const COMBOS: Combo[] = [
  {
    slug: 'llegada-saona',
    name: 'Llegada tranquila + Isla Saona',
    blurb: 'Te recogen en el aeropuerto, te llevan de vuelta al final y un día completo en Saona.',
    items: [{ service: 'traslados', option: 'auto', roundTrip: true }, { service: 'saona', option: 'adulto' }],
  },
  {
    slug: 'aventura',
    name: 'Aventura: buggies + Saona + traslados',
    blurb: 'Traslado ida y vuelta, una mañana de buggies en Macao y el día de catamarán a Saona.',
    items: [{ service: 'traslados', option: 'auto', roundTrip: true }, { service: 'buggies', option: 'doble' }, { service: 'saona', option: 'adulto' }],
  },
  {
    slug: 'todo',
    name: 'Todo Punta Cana',
    blurb: 'Los cuatro: traslados ida y vuelta, buggies, Saona y la noche de Coco Bongo.',
    items: [{ service: 'traslados', option: 'auto', roundTrip: true }, { service: 'buggies', option: 'doble' }, { service: 'saona', option: 'adulto' }, { service: 'coco-bongo', option: 'regular' }],
  },
];

export const FAQ = [
  {
    q: '¿Cuánto cuesta el taxi del aeropuerto de Punta Cana a Bávaro?',
    a: 'El taxi oficial del aeropuerto tiene tarifa fija por hotel: la mayoría de Bávaro está entre 20 y 40 USD por vehículo. Un traslado privado reservado aquí cuesta desde 35 USD, con chofer esperándote con tu nombre y confirmación por escrito antes de viajar.',
  },
  {
    q: '¿Funciona Uber en Punta Cana?',
    a: 'Sí, pero en el aeropuerto los conductores de Uber no pueden recogerte en la terminal y suele haber esperas. Si llegas de noche o con niños, un traslado reservado te evita el problema.',
  },
  {
    q: '¿Cómo se paga?',
    a: 'Reservas en esta página y pagas con tarjeta en un enlace de pago seguro. Nosotros coordinamos y pagamos al operador que presta el servicio. El día del servicio no tienes que pagar nada más, salvo propinas si quieres darlas.',
  },
  {
    q: '¿Hay descuento si reservo varios tours?',
    a: 'Sí. Dos tours en la misma reserva tienen 5 % de descuento, tres tienen 8 % y los cuatro, 10 %. El descuento se aplica solo en el total antes de pagar; no hace falta código.',
  },
  {
    q: '¿Puedo cancelar?',
    a: 'Sí. Cancelación gratuita hasta 24 horas antes en todos los servicios, con reembolso completo. Si el operador cancela por clima, se devuelve el 100 %.',
  },
  {
    q: '¿Quién presta el servicio?',
    a: 'Operadores locales con licencia de turismo en República Dominicana. Nosotros vendemos, coordinamos y te atendemos en español antes, durante y después; ellos ponen los vehículos, los barcos y los guías.',
  },
];
