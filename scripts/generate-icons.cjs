const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const green = { r: 0, g: 104, b: 71, a: 255 };
const white = { r: 255, g: 255, b: 255, a: 255 };

function starPoints(cx, cy, outer, inner) {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function contains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  const outer = starPoints(size / 2, size / 2, size * 0.46, size * 0.19);
  const inner = starPoints(size / 2, size / 2, size * 0.27, size * 0.11);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (size * y + x) << 2;
      const color = contains(outer, x + 0.5, y + 0.5) && !contains(inner, x + 0.5, y + 0.5) ? green : white;
      png.data[offset] = color.r;
      png.data[offset + 1] = color.g;
      png.data[offset + 2] = color.b;
      png.data[offset + 3] = color.a;
    }
  }
  return PNG.sync.write(png);
}

for (const size of [192, 512, 1024]) {
  const data = makeIcon(size);
  const destinations = size === 192
    ? ['public/icon-192.png']
    : size === 512
      ? ['public/icon-512.png']
      : ['assets/icon.png', 'assets/adaptive-icon.png', 'assets/favicon.png', 'assets/splash-icon.png'];
  for (const relative of destinations) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, data);
  }
}
