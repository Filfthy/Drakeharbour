// made by tools/make-folk.py from art/townsfolk.png: the layout of img/folk.png. Each row is one kind of
// figure in cells of [width, height] (atlas pixels, twice map pixels), sixteen frames: four towards you,
// four walking left, four right, four away; feet at the middle of each cell's bottom edge, PAD up.
const FOLK_SHEET = { pad: 2, rows: {
  traveller: { y: 0, w: 22, h: 30 },
  guard: { y: 30, w: 24, h: 30 },
  porter: { y: 60, w: 24, h: 29 },
  monk: { y: 89, w: 21, h: 30 },
  lady: { y: 119, w: 21, h: 33 },
  cart: { y: 152, w: 33, h: 30 },
} };
