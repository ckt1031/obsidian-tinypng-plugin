import { Plugin, addIcon } from 'obsidian';
import { safeParseAsync } from 'valibot';

import { compressImages, getAllImages } from './compress';
import { CACHE_JSON_FILE } from './config';
import compressSVGImage from './icons/compress.svg';
import { deobfuscateConfig, obfuscateConfig } from './obfuscate-config';
import { SettingTab } from './settings-tab';
import {
	type ObfuscatedPluginSettings,
	ObfuscatedPluginSettingsSchema,
	type PluginSettings,
} from './types';

const DEFAULT_SETTINGS: PluginSettings = {
	tinypngApiKey: '',
	tinypngBaseUrl: 'https://api.tinify.com',
	concurrency: 5,
	ignoredFolders: [],
	allowedFolders: [],
	cacheFilePath: CACHE_JSON_FILE,
	compressAllowedFoldersOnly: false,
};

export default class TinypngPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		addIcon('compress', compressSVGImage);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('compress', 'Compress images', async () => {
			const images = getAllImages(this);
			await compressImages(this.app, this.settings, images);
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'compress-images',
			name: 'Compress images in the current vault',
			callback: async () => {
				const images = getAllImages(this);
				await compressImages(this.app, this.settings, images);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this));
	}

	onunload() {
		// This is called when the plugin is deactivated
	}

	async loadSettings() {
		const localData: ObfuscatedPluginSettings = await this.loadData();

		const { success } = await safeParseAsync(
			ObfuscatedPluginSettingsSchema,
			localData,
		);

		if (!success) {
			this.settings = DEFAULT_SETTINGS;
			console.log('Failed to parse settings, using defaults.');
			return;
		}

		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			deobfuscateConfig(localData),
		);
	}

	async saveSettings() {
		await this.saveData(obfuscateConfig(this.settings));
	}
}
