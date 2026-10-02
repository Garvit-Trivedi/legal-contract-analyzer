async function test() {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log(Object.keys(pdfjs));
  } catch (err) {
    console.error(err);
  }
}
test();
