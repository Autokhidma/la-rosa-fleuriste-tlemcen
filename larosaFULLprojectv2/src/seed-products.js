/**
 * Produits de démarrage (modifiables depuis le panneau admin).
 * Prix en dinars algériens (DA). Les images SVG sont générées par scripts/gen-images.js
 */
const J = JSON.stringify;

const sizes = (s, m, l, xl) =>
  J(
    [
      s != null && { label: 'S — Petit', price: s },
      m != null && { label: 'M — Moyen', price: m },
      l != null && { label: 'L — Grand', price: l },
      xl != null && { label: 'XL — Prestige', price: xl },
    ].filter(Boolean)
  );

const products = [
  {
    name: 'Bouquet Rouge Passion',
    category: 'Bouquets',
    description:
      "Le grand classique de La Rosa : des roses rouges fraîches emballées avec élégance, symbole d'amour éternel. Parfait pour déclarer votre flamme.",
    special: 'Roses fraîches du jour • Carte message offerte • Emballage signature La Rosa',
    price: 4500,
    images: J(['/img/products/p01.svg']),
    sizes: sizes(3500, 4500, 6000, 8500),
    colors: J([
      { name: 'Rouge passion', hex: '#c81d3c' },
      { name: 'Blanc pur', hex: '#f6f1ea' },
      { name: 'Rose tendre', hex: '#f4a7c3' },
    ]),
    best_seller: 1,
    sort_order: 1,
  },
  {
    name: 'Box Fleurie Signature',
    category: 'Box & Paniers',
    description:
      "Notre box signature : une composition luxueuse de roses et pivoines dans une boîte ronde élégante. L'attention qui fait toujours son effet.",
    special: 'Boîte réutilisable • Mousse hydratante (tient 7 jours) • Ruban satin personnalisé',
    price: 6500,
    images: J(['/img/products/p02.svg']),
    sizes: sizes(5000, 6500, 8500, 12000),
    colors: J([
      { name: 'Rose poudré', hex: '#f4a7c3' },
      { name: 'Fuchsia', hex: '#d63384' },
      { name: 'Champagne', hex: '#f3d9b1' },
    ]),
    best_seller: 1,
    sort_order: 2,
  },
  {
    name: 'Bouquet Pastel Rêveur',
    category: 'Bouquets',
    description:
      'Un nuage de douceur : roses pastel, lisianthus et gypsophile pour un bouquet romantique et léger comme un rêve.',
    special: 'Mélange de saison • Parfum délicat • Idéal anniversaires et remerciements',
    price: 5000,
    images: J(['/img/products/p03.svg']),
    sizes: sizes(3800, 5000, 6800, 9500),
    colors: J([
      { name: 'Pastel mixte', hex: '#f7c8d8' },
      { name: 'Lavande', hex: '#b9a7e0' },
      { name: 'Pêche', hex: '#ffc9a3' },
    ]),
    best_seller: 1,
    sort_order: 3,
  },
  {
    name: 'Rose Éternelle sous Cloche',
    category: 'Roses Éternelles',
    description:
      "La Belle et la Bête à Tlemcen : une véritable rose stabilisée sous cloche en verre, qui reste splendide pendant des années sans entretien.",
    special: 'Rose naturelle stabilisée (3+ ans) • Lumières LED incluses • Socle bois gravable',
    price: 7500,
    images: J(['/img/products/p04.svg']),
    sizes: J([
      { label: 'Classique', price: 7500 },
      { label: 'Deluxe LED', price: 9500 },
    ]),
    colors: J([
      { name: 'Rouge', hex: '#c81d3c' },
      { name: 'Rose', hex: '#e56aa2' },
      { name: 'Bleu royal', hex: '#3557b7' },
      { name: 'Doré', hex: '#d4a017' },
    ]),
    best_seller: 1,
    sort_order: 4,
  },
  {
    name: 'Bouquet de Mariée Élégance',
    category: 'Mariage',
    description:
      "Le bouquet de vos rêves pour le plus beau jour de votre vie : roses, pivoines et verdure fine, conçu sur mesure avec la mariée.",
    special: 'Consultation personnalisée offerte • Assorti à votre thème • Boutonnière du marié offerte',
    price: 9000,
    images: J(['/img/products/p05.svg']),
    sizes: sizes(null, 9000, 12000, 16000),
    colors: J([
      { name: 'Blanc ivoire', hex: '#f6f1ea' },
      { name: 'Blush', hex: '#f7c8d8' },
      { name: 'Bordeaux', hex: '#7c1f3a' },
    ]),
    best_seller: 0,
    sort_order: 5,
  },
  {
    name: 'Bouquet Tulipes du Printemps',
    category: 'Bouquets',
    description:
      'Des tulipes éclatantes qui apportent le printemps dans votre salon. Fraîcheur et couleurs garanties.',
    special: 'Disponible en saison • Bulbes premium importés',
    price: 4000,
    images: J(['/img/products/p06.svg']),
    sizes: sizes(3000, 4000, 5500, null),
    colors: J([
      { name: 'Jaune soleil', hex: '#f5c518' },
      { name: 'Rouge', hex: '#d0342c' },
      { name: 'Rose', hex: '#ef7fae' },
      { name: 'Mixte', hex: '#e8862e' },
    ]),
    best_seller: 0,
    sort_order: 6,
  },
  {
    name: 'Panier Gourmand Fleuri',
    category: 'Box & Paniers',
    description:
      'Le cadeau complet : un panier garni de fleurs fraîches et de chocolats fins. Deux plaisirs en un.',
    special: 'Chocolats artisanaux • Panier en osier offert • Possibilité d’ajouter un ballon',
    price: 9500,
    images: J(['/img/products/p07.svg']),
    sizes: sizes(null, 9500, 12500, 16500),
    colors: J([
      { name: 'Rose & or', hex: '#e56aa2' },
      { name: 'Rouge & or', hex: '#c81d3c' },
    ]),
    best_seller: 0,
    sort_order: 7,
  },
  {
    name: 'Bouquet Champêtre Soleil',
    category: 'Bouquets',
    description:
      'Tournesols, marguerites et verdure sauvage : un bouquet joyeux qui met du soleil dans la journée.',
    special: 'Style champêtre naturel • Longue tenue en vase',
    price: 3500,
    images: J(['/img/products/p08.svg']),
    sizes: sizes(2800, 3500, 4800, null),
    colors: J([
      { name: 'Soleil', hex: '#f5c518' },
      { name: 'Orange', hex: '#e8862e' },
    ]),
    best_seller: 0,
    sort_order: 8,
  },
  {
    name: 'Orchidée en Pot Prestige',
    category: 'Plantes',
    description:
      "L'élégance qui dure : une orchidée phalaenopsis double branche dans son cache-pot céramique.",
    special: 'Plante vivante (fleurit plusieurs mois) • Cache-pot céramique inclus • Guide d’entretien offert',
    price: 5500,
    images: J(['/img/products/p09.svg']),
    sizes: J([
      { label: '1 branche', price: 4000 },
      { label: '2 branches', price: 5500 },
      { label: '3 branches', price: 7500 },
    ]),
    colors: J([
      { name: 'Blanc', hex: '#f6f1ea' },
      { name: 'Rose', hex: '#ef7fae' },
      { name: 'Violet', hex: '#8e44ad' },
    ]),
    best_seller: 0,
    sort_order: 9,
  },
  {
    name: 'Bouquet Naissance Douceur',
    category: 'Occasions',
    description:
      "Souhaitez la bienvenue au nouveau-né avec ce bouquet tout en douceur, disponible en bleu ou rose. Ballon « Welcome Baby » en option.",
    special: 'Thème garçon ou fille • Peluche en option • Livraison directe à la clinique possible',
    price: 4800,
    images: J(['/img/products/p10.svg']),
    sizes: sizes(3800, 4800, 6500, null),
    colors: J([
      { name: 'Bleu bébé', hex: '#8ec5e8' },
      { name: 'Rose bébé', hex: '#f7c8d8' },
      { name: 'Neutre pastel', hex: '#d9e8c5' },
    ]),
    best_seller: 0,
    sort_order: 10,
  },
  {
    name: 'Cœur de Roses « Je t’aime »',
    category: 'Occasions',
    description:
      'Une composition spectaculaire en forme de cœur, entièrement réalisée en roses fraîches. La déclaration ultime.',
    special: 'Environ 50 roses • Lettres personnalisables • Le best du 14 février',
    price: 8500,
    images: J(['/img/products/p11.svg']),
    sizes: sizes(null, 8500, 12000, 18000),
    colors: J([
      { name: 'Rouge', hex: '#c81d3c' },
      { name: 'Rouge & blanc', hex: '#e8b4c4' },
    ]),
    best_seller: 1,
    sort_order: 11,
  },
  {
    name: 'Bouquet Gypsophile Nuage',
    category: 'Bouquets',
    description:
      'Le fameux « baby breath » : un nuage aérien de gypsophile, naturel ou teinté à la couleur de votre choix.',
    special: 'Tendance Instagram • Sèche magnifiquement (souvenir durable)',
    price: 3800,
    images: J(['/img/products/p12.svg']),
    sizes: sizes(3000, 3800, 5200, null),
    colors: J([
      { name: 'Blanc naturel', hex: '#f6f1ea' },
      { name: 'Rose', hex: '#f7c8d8' },
      { name: 'Bleu ciel', hex: '#8ec5e8' },
      { name: 'Lilas', hex: '#b9a7e0' },
    ]),
    best_seller: 0,
    sort_order: 12,
  },
  {
    name: 'Nounours Câlin + Roses',
    category: 'Nounours',
    description:
      'Un adorable nounours tout doux accompagné de ses roses : le duo qui fait fondre les cœurs, pour les grandes déclarations comme les petits pardons.',
    special: 'Peluche premium toute douce • Roses fraîches assorties • Emballage cadeau offert',
    price: 6500,
    images: J(['/img/products/p13.svg']),
    sizes: J([
      { label: 'Nounours 30 cm', price: 6500 },
      { label: 'Nounours 60 cm', price: 9500 },
      { label: 'Nounours géant 1 m', price: 16000 },
    ]),
    colors: J([
      { name: 'Beige', hex: '#d9b38c' },
      { name: 'Blanc', hex: '#f6f1ea' },
      { name: 'Rose', hex: '#f4a7c3' },
    ]),
    best_seller: 1,
    sort_order: 13,
    rating: 4.9,
    rating_count: 47,
  },
  {
    name: 'Boule de Neige Rose Éternelle',
    category: 'Boules de neige',
    description:
      'Une rose éternelle qui danse sous la neige pailletée : secouez-la et laissez la magie opérer. Un cadeau souvenir inoubliable.',
    special: 'Paillettes scintillantes • Socle personnalisable (prénom gravé) • Lumière LED en option',
    price: 4500,
    images: J(['/img/products/p14.svg']),
    sizes: J([
      { label: 'Classique', price: 4500 },
      { label: 'Grande + LED', price: 6500 },
    ]),
    colors: J([
      { name: 'Rouge', hex: '#c81d3c' },
      { name: 'Rose', hex: '#ef7fae' },
      { name: 'Doré', hex: '#d4a017' },
    ]),
    best_seller: 0,
    sort_order: 14,
    rating: 4.7,
    rating_count: 23,
  },
  {
    name: 'Montre Élégance + Rose Gold',
    category: 'Montres',
    description:
      "Une montre femme raffinée présentée dans son coffret avec une rose : l'élégance à l'heure de l'amour.",
    special: 'Coffret cadeau luxe • Rose éternelle incluse • Garantie 1 an',
    price: 8900,
    images: J(['/img/products/p15.svg']),
    sizes: J([
      { label: 'Coffret classique', price: 8900 },
      { label: 'Coffret prestige (+ bracelet)', price: 12500 },
    ]),
    colors: J([
      { name: 'Rose gold', hex: '#e8a87c' },
      { name: 'Argenté', hex: '#c0c0c0' },
      { name: 'Doré', hex: '#d4a017' },
    ]),
    best_seller: 0,
    sort_order: 15,
    rating: 4.8,
    rating_count: 15,
  },
  {
    name: 'Coffret Parfum & Fleurs',
    category: 'Parfums',
    description:
      'Le luxe absolu : un parfum de grande marque niché dans un écrin de fleurs fraîches. Deux parfums pour le prix d’un — celui du flacon et celui des roses.',
    special: 'Parfums originaux garantis • Composition florale assortie • Carte message offerte',
    price: 9800,
    images: J(['/img/products/p16.svg']),
    sizes: J([
      { label: 'Coffret 50 ml', price: 9800 },
      { label: 'Coffret 100 ml', price: 14500 },
    ]),
    colors: J([
      { name: 'Rose & or', hex: '#e56aa2' },
      { name: 'Rouge & noir', hex: '#c81d3c' },
    ]),
    best_seller: 1,
    sort_order: 16,
    rating: 5,
    rating_count: 31,
  },
];

// Notes par défaut pour les produits sans rating explicite (variées mais stables)
module.exports = products.map((p, i) => ({
  rating: p.rating ?? [4.9, 4.7, 4.8, 5, 4.6, 4.7, 4.9, 4.5, 4.8, 4.7, 5, 4.6][i % 12],
  rating_count: p.rating_count ?? 9 + ((i * 17) % 38),
  ...p,
}));
