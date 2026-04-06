import esbuild from 'esbuild';

const shared = {
  entryPoints: ['src/sidenotes.js'],
  bundle: true,
  sourcemap: true,
};

await esbuild.build({ ...shared, format: 'esm', outfile: 'dist/sidenotes.esm.js' });
await esbuild.build({ ...shared, format: 'cjs', outfile: 'dist/sidenotes.cjs.js' });
await esbuild.build({
  ...shared,
  format: 'iife',
  globalName: 'Sidenotes',
  minify: true,
  outfile: 'dist/sidenotes.min.js',
});

console.log('Build complete: dist/sidenotes.{esm,cjs,min}.js');
