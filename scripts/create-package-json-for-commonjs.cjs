const content = `{
    "type": "commonjs"
}`;

const fs = require('node:fs');
const path = require('node:path');
const packageJsonPath = path.join(__dirname, '../dist/cjs/package.json');
fs.writeFileSync(packageJsonPath, content, 'utf8');