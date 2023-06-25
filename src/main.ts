import { addIcon, Plugin } from 'obsidian';

import { compressImages, getAllImages } from './compress';
import { deobfuscateConfig, obfuscateConfig } from './obfuscate-config';
import { SettingTab } from './settings-tab';
import type { PluginSettings } from './types';

const DEFAULT_SETTINGS: PluginSettings = {
	tinypngApiKey: '',
	tinypngBaseUrl: 'https://api.tinify.com',
	concurrency: 5,
};

export default class TinypngPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		addIcon(
			'compress',
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 5v14M19 12l-7 7-7-7"/>
		</svg>
	`,
		);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('compress', 'Compress images', async () => {
			const images = getAllImages(this.app);
			await compressImages(this.settings, images);
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'compress-images',
			name: 'Compress images in the current vault',
			callback: async () => {
				const images = getAllImages(this.app);
				await compressImages(this.settings, images);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {
		// This is called when the plugin is deactivated
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			deobfuscateConfig((await this.loadData()) as Record<string, string>),
		);
	}

	async saveSettings() {
		await this.saveData(obfuscateConfig(this.settings));
	}
}
