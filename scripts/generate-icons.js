const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const inputSvg = path.join(__dirname, '../assets/icon.svg');
const outputDir = path.join(__dirname, '../build');

// 디렉토리 생성
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 각 크기별로 PNG 생성
sizes.forEach(size => {
  sharp(inputSvg)
    .resize(size, size)
    .png()
    .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
    .then(() => {
      console.log(`Generated icon-${size}x${size}.png`);
    })
    .catch(err => {
      console.error(`Error generating icon-${size}x${size}.png:`, err);
    });
});

// macOS용 ICNS를 위한 iconset 디렉토리 생성
const iconsetDir = path.join(outputDir, 'icon.iconset');
if (!fs.existsSync(iconsetDir)) {
  fs.mkdirSync(iconsetDir, { recursive: true });
}

// iconset 파일 생성
const iconsetSizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' }
];

iconsetSizes.forEach(({ size, name }) => {
  sharp(inputSvg)
    .resize(size, size)
    .png()
    .toFile(path.join(iconsetDir, name))
    .then(() => {
      console.log(`Generated ${name}`);
    })
    .catch(err => {
      console.error(`Error generating ${name}:`, err);
    });
});

// Windows ICO 생성을 위한 메인 아이콘
sharp(inputSvg)
  .resize(256, 256)
  .png()
  .toFile(path.join(outputDir, 'icon.png'))
  .then(() => {
    console.log('Generated icon.png');
  })
  .catch(err => {
    console.error('Error generating icon.png:', err);
  });