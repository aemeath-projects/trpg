import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/dice/index.ts',
    'src/coc/index.ts',
    'src/dnd/index.ts',
    'src/decks/index.ts',
    'src/stats/index.ts',
    'src/log/index.ts',
    'src/story/index.ts',
  ],
  outDir: 'dist',
  format: 'esm',
  dts: { resolve: false },
  sourcemap: true,
  minify: true,
  clean: true,
  splitting: true,
  treeshake: true,
})
