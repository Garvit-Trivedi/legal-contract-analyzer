const fs = require('fs');
fs.writeFileSync('/tmp/scanned.pdf', Buffer.from('%PDF-1.4\n1 0 obj <<>>\nendobj\ntrailer << /Root 1 0 R >>\n%%EOF'));
