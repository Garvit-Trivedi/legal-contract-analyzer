const fs = require('fs');
const pdfParse = require('pdf-parse');
async function run() {
  const data = fs.readFileSync('hiring assignment.pdf');
  const pdfInfo = await pdfParse(data);
  console.log(pdfInfo.numpages);
  console.log(pdfInfo.text.substring(0, 100));
}
run();
