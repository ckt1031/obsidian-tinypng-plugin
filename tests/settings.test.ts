import { describe, expect, it } from 'vitest';

import { deobfuscateConfig, obfuscateConfig } from '../src/obfuscate-config';
import type { PluginSettings } from '../src/types';

const DEFAULT_SETTINGS: PluginSettings = {
	tinypngApiKey: 'FAKE_API_KEY',
	tinypngBaseUrl: 'https://api.example.com',
	concurrency: 20,
	ignoredFolders: ['node_modules', '.git'],
	allowedFolders: ['assets'],
	cacheFilePath: '.ok/cache.json',
	compressAllowedFoldersOnly: false,
	extraImageFormats: 'png,jpg,webp',
};

describe('obfuscateConfig and deobfuscateConfig', () => {
	it('should obfuscate and deobfuscate the config correctly', () => {
		const obfuscatedConfig = obfuscateConfig(DEFAULT_SETTINGS);

		// Expect not to be equal to the default settings
		expect(obfuscatedConfig).not.toEqual(DEFAULT_SETTINGS);

		// Expect not to be undefined or null
		expect(obfuscatedConfig).not.toBeUndefined();
		expect(obfuscatedConfig).not.toBeNull();

		if (!obfuscatedConfig) {
			return;
		}

		const deobfuscatedConfig = deobfuscateConfig(obfuscatedConfig);

		expect(deobfuscatedConfig).toEqual(DEFAULT_SETTINGS);
	});

	it('should return null for empty or undefined input', () => {
		expect(obfuscateConfig(undefined)).toBeUndefined();
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		expect(deobfuscateConfig({})).toBeUndefined();
	});
});
