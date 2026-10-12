const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const swcLoader = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'swc', 'index.js');
const loaderSource = fs.readFileSync(swcLoader, 'utf8');
const loaderMarker = 'let pkgPath = pkg;\n                if (importPath) {';

if (loaderSource.includes(loaderMarker)) {
  fs.writeFileSync(
    swcLoader,
    loaderSource.replace(loaderMarker, "let pkgPath = importPath ? pkg : require.resolve(`${pkg}/wasm.js`);\n                if (importPath) {")
  );
}

const nextBinary = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBinary, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', code => process.exit(code ?? 1));
