import process from 'node:process';

import builtins from 'builtin-modules';
import esbuild from 'esbuild';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: ['obsidian', ...builtins],
	format: 'cjs',
	target: 'es2022',
	logLevel: 'info',
	minify: true,
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	legalComments: 'none',
	outfile: 'main.js',
});

if (prod) {
	await context.rebuild();
	// eslint-disable-next-line unicorn/no-process-exit
	process.exit(0);
} else {
	await context.watch();
}
