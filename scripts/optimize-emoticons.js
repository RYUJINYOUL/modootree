const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const LOGOS_DIR = path.join(process.cwd(), 'public', 'logos');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'emoticons');

async function optimizeEmoticon(inputFile) {
  const filename = path.basename(inputFile, '.png');
  const outputFile = path.join(OUTPUT_DIR, `${filename}.png`); // PNG 형식 유지

  try {
    await sharp(inputFile)
      .resize(360, 360, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        position: 'center'
      })
      .png({ 
        compressionLevel: 9,
        quality: 90,
        effort: 10,
        palette: true
      })
      .toFile(outputFile);
    
    // 파일 크기 확인
    const stats = await fs.stat(outputFile);
    const fileSizeKB = stats.size / 1024;
    
    console.log(`✅ Converted: ${filename} (${fileSizeKB.toFixed(2)}KB)`);
  } catch (error) {
    console.error(`❌ Error converting ${filename}:`, error);
  }
}

async function main() {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Get all PNG files
    const files = await fs.readdir(LOGOS_DIR);
    const pngFiles = files.filter(file => file.endsWith('.png'));

    console.log(`Found ${pngFiles.length} PNG files to convert...`);
    console.log('Converting to 360x360 Kakao-style emoticons...\n');

    // Convert all files
    await Promise.all(
      pngFiles.map(file => 
        optimizeEmoticon(path.join(LOGOS_DIR, file))
      )
    );

    console.log('\n✨ All done! Optimized emoticons are in the public/emoticons directory.');
    console.log('💡 Tip: Each emoticon is 360x360px with transparent background');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();