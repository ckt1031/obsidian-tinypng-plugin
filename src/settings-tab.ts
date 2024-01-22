import type { App } from 'obsidian';
import { Notice, PluginSettingTab, Setting } from 'obsidian';

import manifest from '../manifest.json';
import { addImageToCache, clearCache } from './cache';
import { getAllImages } from './compress';
import type TinypngPlugin from './main';
import { AddFolderModal, AddFolderMode } from './modals/add-folder';
import ConfirmModal from './modals/confirm';
import store from './store';

export class SettingTab extends PluginSettingTab {
	plugin: TinypngPlugin;

	constructor(app: App, plugin: TinypngPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private static createFragmentWithHTML = (html: string) =>
		createFragment(
			(documentFragment) => (documentFragment.createDiv().innerHTML = html),
		);

	display(): void {
		const { containerEl, plugin, app } = this;

		containerEl.empty();

		containerEl.createEl('h1', { text: manifest.name });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc(
				SettingTab.createFragmentWithHTML(
					'API Key for the tinypng service, you can get one <a href="https://tinify.com/dashboard/api" target="_blank">here</a>',
				),
			)
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(plugin.settings.tinypngApiKey)
					.onChange(async (value) => {
						plugin.settings.tinypngApiKey = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('TinyPNG Base URL')
			.setDesc(
				SettingTab.createFragmentWithHTML(
					'Base URL for the tinypng service, defaults to <code>https://api.tinify.com</code>',
				),
			)
			.addText((text) =>
				text
					.setPlaceholder('Enter your base URL')
					.setValue(plugin.settings.tinypngBaseUrl)
					.onChange(async (value) => {
						plugin.settings.tinypngBaseUrl = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Compress Allowed Folders Only')
			.setDesc(
				'Compress the allowed folder only. If no, then it will compress all folders except ignored folders.',
			)
			.addToggle((toggle) => {
				toggle
					.setValue(plugin.settings.compressAllowedFoldersOnly)
					.onChange(async (value) => {
						plugin.settings.compressAllowedFoldersOnly = value;
						await plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Concurrency')
			.setDesc('Number of images to compress at once')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('1', '1')
					.addOption('5', '5 (Default)')
					.addOption('10', '10')
					.addOption('20', '20')
					.addOption('50', '50 (High CPU Usage)')
					.setValue(plugin.settings.concurrency.toString())
					.onChange(async (value) => {
						plugin.settings.concurrency = Number.parseInt(value);
						await plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Reset Local Store')
			.setDesc(
				SettingTab.createFragmentWithHTML(
					'<b>This is a debug option!</b> This will reset the local store, which can fix some temporary issues.',
				),
			)
			.addButton((button) => {
				button.setButtonText('Reset').onClick(() => {
					new ConfirmModal(app, async () => {
						await store.clear();
						new Notice('Local store has been reset');
					}).open();
				});
			});

		new Setting(containerEl)
			.setName('Save all image to cache without compression')
			.setDesc(
				SettingTab.createFragmentWithHTML(
					'<b>This is a debug option!</b> If you are certain that all images are compressed and you have lost the cache file, you can use this option to temporarily recover the cache file.',
				),
			)
			.addButton((button) => {
				button.setButtonText('Reset').onClick(() => {
					new ConfirmModal(app, async () => {
						const allImages = getAllImages(plugin);
						for (const image of allImages) {
							await addImageToCache(image);
						}
						new Notice('All images have been added to the cache');
					}).open();
				});
			});

		new Setting(containerEl)
			.setName('Clear all images records from cache')
			.setDesc(
				SettingTab.createFragmentWithHTML(
					'<b>This is a debug and VERY DANGEROUS option!</b> You will lose all the records of the images that have been compressed. This will not delete the images themselves, but you will be compressing them again.',
				),
			)
			.addButton((button) => {
				button.setButtonText('Reset').onClick(() => {
					new ConfirmModal(app, async () => {
						await clearCache();
						new Notice('All images have been removed from the cache');
					}).open();
				});
			});

		if (plugin.settings.compressAllowedFoldersOnly) {
			containerEl.createEl('h2', { text: 'Allowed Folders' });

			new Setting(containerEl)
				.setName('Add')
				.setDesc('Add a folder to the allowed folders list')
				.addButton((button) => {
					button.setButtonText('Add').onClick(async () => {
						await (plugin as any).app.setting.close();
						new AddFolderModal(plugin, AddFolderMode.Allowed).open();
					});
				});

			for (const path of plugin.settings.allowedFolders) {
				new Setting(containerEl).setName(path).addButton((btn) => {
					btn.setIcon('cross');
					btn.setTooltip('Delete this folder from the allowed folders list');
					btn.onClick(async () => {
						if (btn.buttonEl.textContent === '') {
							btn.setButtonText('Click once more to confirm removal');
							setTimeout(() => {
								btn.setIcon('cross');
							}, 5000);
						} else {
							if (btn.buttonEl.parentElement?.parentElement) {
								btn.buttonEl.parentElement.parentElement.remove();
							}
							plugin.settings.allowedFolders =
								plugin.settings.allowedFolders.filter((p) => p !== path);
							await plugin.saveSettings();
						}
					});
				});
			}
		}

		containerEl.createEl('h2', { text: 'Ignored Folders' });

		new Setting(containerEl)
			.setName('Add')
			.setDesc('Add a folder to the ignored folders list')
			.addButton((button) => {
				button.setButtonText('Add').onClick(async () => {
					await (plugin as any).app.setting.close();
					new AddFolderModal(plugin, AddFolderMode.Ignored).open();
				});
			});

		for (const path of plugin.settings.ignoredFolders) {
			new Setting(containerEl).setName(path).addButton((btn) => {
				btn.setIcon('cross');
				btn.setTooltip('Delete this folder from the ignored folders list');
				btn.onClick(async () => {
					if (btn.buttonEl.textContent === '') {
						btn.setButtonText('Click once more to confirm removal');
						setTimeout(() => {
							btn.setIcon('cross');
						}, 5000);
					} else {
						if (btn.buttonEl.parentElement?.parentElement) {
							btn.buttonEl.parentElement.parentElement.remove();
						}
						plugin.settings.ignoredFolders =
							plugin.settings.ignoredFolders.filter((p) => p !== path);
						await plugin.saveSettings();
					}
				});
			});
		}
	}
}
