const fs = require('fs');
const path = require('path');

// Directory paths
const imgDir = path.resolve(__dirname, '../img');
const outputFilePath = path.resolve(__dirname, '../js/embedded-images.js');

// Function to convert image to data URL
const imageToDataURL = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = 'image/' + path.extname(filePath).slice(1);
    const base64 = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
};

// Read the image directory and filter files
const files = fs.readdirSync(imgDir).filter(file => file.startsWith('bitcoin-'));

// Create a map of filenames to data URLs
const imageMap = {};
files.forEach(file => {
    const filePath = path.join(imgDir, file);
    imageMap[file] = imageToDataURL(filePath);
});

// Write the map to the output file as JSON
const outputContent = `const embeddedImages = ${JSON.stringify(imageMap, null, 2)};`;
fs.writeFileSync(outputFilePath, outputContent);

console.log('Embedded images map has been written to', outputFilePath);
