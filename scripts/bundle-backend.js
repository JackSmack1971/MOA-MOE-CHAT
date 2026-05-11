const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/bundle.js',
  external: ['postgres', 'onnxruntime-node', 'onnxruntime-web'], 
  loader: { '.prompt.ts': 'ts' },
  minify: true,
}).catch(() => process.exit(1));
