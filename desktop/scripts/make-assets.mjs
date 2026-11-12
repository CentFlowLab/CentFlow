// Ícones da janela e do pacote MSIX a partir de assets/icon.png (logótipo B, ADR-036).
// Saída: build/icon.png (janela e .exe) e build/appx/* (Menu Iniciar, barra de tarefas, Store).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(desktop, '..');
const require = createRequire(join(root, 'package.json'));
const Jimp = require('jimp-compact');

const source = await Jimp.read(join(root, 'assets', 'icon.png'));
// Fundo das imagens largas: a cor do canto do ícone (o mesmo fundo do logótipo).
const background = source.getPixelColor(2, 2);

mkdirSync(join(desktop, 'build', 'appx'), { recursive: true });
await source
  .clone()
  .resize(512, 512)
  .writeAsync(join(desktop, 'build', 'icon.png'));

const square = async (name, size) =>
  source
    .clone()
    .resize(size, size)
    .writeAsync(join(desktop, 'build', 'appx', name));
await square('StoreLogo.png', 50);
await square('Square44x44Logo.png', 44);
await square('Square150x150Logo.png', 150);
await square('LargeTile.png', 310);
await square('SmallTile.png', 71);

const wide = new Jimp(310, 150, background);
wide.composite(source.clone().resize(130, 130), 90, 10);
await wide.writeAsync(join(desktop, 'build', 'appx', 'Wide310x150Logo.png'));

console.log('Ícones gerados em desktop/build.');
