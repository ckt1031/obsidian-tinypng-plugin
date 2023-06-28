import { CONFIG_ENCRYPT_KEY } from './config';
import type { ObfuscatedPluginSettings, PluginSettings } from './types';

export const reverseString = (s: string) => {
	return [...s].reverse().join('');
};

export const xorCipher = (s: string, key: string) => {
	return (
		[...s]
			// eslint-disable-next-line unicorn/prefer-code-point
			.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
			.join('')
	);
};

export const deobfuscateConfig = (
	x: ObfuscatedPluginSettings | undefined,
): PluginSettings | undefined => {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!x?.j) {
		return undefined;
	}

	let deobfuscatedConfig = x.j;

	// Reverse the string
	deobfuscatedConfig = reverseString(deobfuscatedConfig);

	// Apply XOR cipher
	deobfuscatedConfig = xorCipher(deobfuscatedConfig, CONFIG_ENCRYPT_KEY);

	return JSON.parse(deobfuscatedConfig) as PluginSettings;
};

export const obfuscateConfig = (
	x: PluginSettings | null | undefined,
): ObfuscatedPluginSettings | undefined => {
	if (x === null || x === undefined) {
		return undefined;
	}

	let obfuscatedConfig = JSON.stringify(x);

	// Apply XOR cipher
	obfuscatedConfig = xorCipher(obfuscatedConfig, CONFIG_ENCRYPT_KEY);

	// Reverse the string
	obfuscatedConfig = reverseString(obfuscatedConfig);

	return {
		_NOTICE:
			'DO NOT MODIFY THIS CONFIGURATION OR SHARE IT WITH ANYONE. IT SHOULD BE KEPT SECRET AND SECURE AT ALL TIMES. FAILURE TO COMPLY MAY DISRUPT THE FUNCTIONALITY OF THE SYSTEM.',
		j: obfuscatedConfig,
	};
};
