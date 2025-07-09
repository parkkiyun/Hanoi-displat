const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../assets/icon.svg');
const outputDir = path.join(__dirname, '../assets');

// Windows ICO 파일 생성을 위한 크기들
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

async function generateWindowsIcons() {
  console.log('Windows 아이콘 생성 시작...');
  
  try {
    // 각 크기별로 PNG 생성
    const pngPromises = icoSizes.map(size => 
      sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `temp_icon_${size}.png`))
        .then(() => console.log(`Generated ${size}x${size} PNG`))
    );

    await Promise.all(pngPromises);
    
    // 메인 아이콘 (256x256)
    await sharp(inputSvg)
      .resize(256, 256)
      .png()
      .toFile(path.join(outputDir, 'icon.png'));
    
    console.log('메인 아이콘 (icon.png) 생성 완료');
    
    // 설치 파일용 아이콘 (512x512)
    await sharp(inputSvg)
      .resize(512, 512)
      .png()
      .toFile(path.join(outputDir, 'installer-icon.png'));
    
    console.log('설치 파일 아이콘 (installer-icon.png) 생성 완료');
    
    // 임시 파일 정리
    icoSizes.forEach(size => {
      const tempFile = path.join(outputDir, `temp_icon_${size}.png`);
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    });
    
    console.log('Windows 아이콘 생성 완료!');
    
  } catch (error) {
    console.error('아이콘 생성 중 오류:', error);
  }
}

generateWindowsIcons();