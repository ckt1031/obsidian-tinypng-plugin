import {
	type Menu,
	Notice,
	Plugin,
	type TAbstractFile,
	type TFile,
	addIcon,
} from 'obsidian';
import { safeParseAsync } from 'valibot';

import * as localforage from 'localforage';
import { merge } from 'rambda';
import { checkImageFromCache, getCacheFilePath } from './cache';
import {
	checkIsImageInSpecificFolder,
	compressImages,
	getAllImages,
} from './compress';
import {
	checkIsFileImage,
	checkIsFileImageAndAllowed,
	compressSingle,
} from './compress';
import { CACHE_JSON_FILE } from './config';
import compressSVGImage from './icons/compress.svg';
import ConfirmModal from './modals/confirm';
import { deobfuscateConfig, obfuscateConfig } from './obfuscate-config';
import { SettingTab } from './settings-tab';
import {
	type ObfuscatedPluginSettings,
	ObfuscatedPluginSettingsSchema,
	type PluginSettings,
} from './types';
import { type ImageCacheStatus, ImageCompressionProgressStatus } from './types';

const DEFAULT_SETTINGS: PluginSettings = {
	tinypngApiKey: '',
	tinypngBaseUrl: 'https://api.tinify.com',
	concurrency: 5,
	ignoredFolders: [],
	allowedFolders: [],
	cacheFilePath: CACHE_JSON_FILE,
	compressAllowedFoldersOnly: false,
	extraImageFormats: 'png,webp',
	compressOnPaste: false,
	compressOnFileSystemImageCreated: false,
};

export default class TinypngPlugin extends Plugin {
	settings: PluginSettings;
	forage: typeof localforage;
	imageHashes: Map<string, ImageCacheStatus>;

	async onload() {
		await this.loadSettings();
		await this.loadImageCacheFromLocalFile();

		// Initialize localforage instance
		this.forage = localforage.createInstance({
			name: `${this.manifest.id}-${this.app.appId}`,
		});

		addIcon('compress', compressSVGImage);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('compress', 'Compress images', async () => {
			const images = getAllImages(this);
			await compressImages(this, images);
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'compress-images',
			name: 'Compress images in the current vault',
			callback: async () => {
				const images = getAllImages(this);
				await compressImages(this, images);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this));

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on('create', (file) => this.onFileCreated(this, file)),
			);
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				const detailedFile = this.app.vault.getFileByPath(file.path);

				if (!detailedFile) return;

				const isImage = checkIsFileImage(this, detailedFile);

				if (!isImage) return;

				menu.addItem((item) => {
					item.setTitle('Compress image');
					item.setIcon('compress');
					item.onClick(async () => {
						await this.onMenuButtonCreate(menu, detailedFile);
					});
				});
			}),
		);
	}

	private isImagePasted(file: TAbstractFile) {
		return file.name.startsWith('Pasted image');
	}

	private async onMenuButtonCreate(menu: Menu, detailedFile: TFile) {
		const compressedAlready = await checkImageFromCache(this, detailedFile);

		if (compressedAlready) {
			new Notice(`Image ${detailedFile.name} is already compressed`);
			return;
		}

		const doCompression = async () => {
			console.log(`Compressing ${detailedFile.name}`);

			const result = await compressSingle(this, detailedFile);

			this.showPostCompressionNotice(detailedFile, result);
		};

		if (!checkIsImageInSpecificFolder(this, detailedFile)) {
			const msg =
				'This image is located in a folder that may not be intended for compression, do you want to compress it anyway?';
			new ConfirmModal(this.app, doCompression, undefined, msg).open();
			return;
		}

		await doCompression();
	}

	private showPostCompressionNotice(
		detailedFile: TFile,
		result: ImageCompressionProgressStatus,
	) {
		const message = {
			[ImageCompressionProgressStatus.Compressed]: 'successfully',
			[ImageCompressionProgressStatus.Failed]: 'failed',
			[ImageCompressionProgressStatus.AlreadyCompressed]:
				'aborted, already compressed',
		};
		new Notice(`Compression ${message[result]}: ${detailedFile.name}`);
	}

	private async onFileCreated(plugin: TinypngPlugin, file: TAbstractFile) {
		const globallyAllowed = plugin.settings.compressOnFileSystemImageCreated;

		if (!globallyAllowed) {
			// We still have to check if compress pasted images are allowed
			if (!plugin.isImagePasted(file)) return;
			if (!plugin.settings.compressOnPaste) return;
		}

		const detailedFile = plugin.app.vault.getFileByPath(file.path);

		if (!detailedFile) return;

		if (!checkIsFileImageAndAllowed(plugin, detailedFile)) return;

		console.log(`Compressing: ${detailedFile.name}`);

		const result = await compressSingle(plugin, detailedFile);
		this.showPostCompressionNotice(detailedFile, result);
	}

	// This is called when the plugin is deactivated
	onunload() {
		// Clear off the imageHashes
		this.imageHashes.clear();
	}

	async loadImageCacheFromLocalFile() {
		const cacheStorePath = await getCacheFilePath(this);
		const cacheFile = await this.app.vault.adapter.read(cacheStorePath);
		const parsedObject = JSON.parse(cacheFile);

		// Save to memory
		this.imageHashes = new Map(Object.entries(parsedObject));
	}

	async saveImageCacheToLocalFile(key: string, value: ImageCacheStatus) {
		// Add new key to Map (memory)
		this.imageHashes.set(key, value);

		// Save the updated Map to the cache file
		const cacheStorePath = await getCacheFilePath(this);
		const cacheFile = JSON.stringify(Object.fromEntries(this.imageHashes));
		await this.app.vault.adapter.write(cacheStorePath, cacheFile);
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

		this.settings = merge(DEFAULT_SETTINGS)(deobfuscateConfig(localData));
	}

	async saveSettings() {
		await this.saveData(obfuscateConfig(this.settings));
	}
}
