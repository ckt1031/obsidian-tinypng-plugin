import { Notice, PluginSettingTab, Setting } from 'obsidian';

import { addImageToCache, clearCache } from './cache';
import { getAllImages } from './compress';
import type TinypngPlugin from './main';
import { AddFolderModal, AddFolderMode } from './modals/add-folder';
import ConfirmModal from './modals/confirm';

export class SettingTab extends PluginSettingTab {
	plugin: TinypngPlugin;

	constructor(plugin: TinypngPlugin) {
		super(plugin.app, plugin);
		this.plugin = plugin;
	}

	private createFragmentWithHTML = (html: string) =>
		createFragment((documentFragment) => {
			const div = documentFragment.createDiv();
			div.innerHTML = html;
		});

	async restartSettingsTab() {
		await this.plugin.app.setting.close();
		await this.plugin.app.setting.open();
		await this.plugin.app.setting.openTabById(this.plugin.manifest.id);
	}

	display(): void {
		const { containerEl, plugin, app } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('API Key')
			.setDesc(
				this.createFragmentWithHTML(
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
				this.createFragmentWithHTML(
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
						// reload the settings tab
						await this.restartSettingsTab();
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
			.setName('Extra Image Formats')
			.setDesc(
				'Enter the extra image formats to compress, separated by commas, do not include dot or space',
			)
			.addTextArea((text) => {
				text
					.setPlaceholder('png,jpg,webp')
					.setValue(plugin.settings.extraImageFormats)
					.onChange(async (value) => {
						// Check only if the it has ONLY letter and commas
						if (/^[a-zA-Z,]+$/.test(value)) {
							plugin.settings.extraImageFormats = value;
							await plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName('Cache File Path')
			.setDesc(
				this.createFragmentWithHTML(
					'<b>DANGER:</b> This setting is for advanced users. Changing the cache file path can lead to data inconsistencies and redundant API calls. If you change this path, make sure to manually copy the cache file to the new location.',
				),
			)
			.addText((text) => {
				text
					.setPlaceholder('Enter the path for the cache file')
					.setValue(plugin.settings.cacheFilePath)
					.onChange(async (value) => {
						plugin.settings.cacheFilePath = value;
						await plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Reset Local Store')
			.setDesc(
				this.createFragmentWithHTML(
					'<b>This is a debug option!</b> This will reset the local store, which can fix some temporary issues.',
				),
			)
			.addButton((button) => {
				button.setButtonText('Reset').onClick(() => {
					new ConfirmModal(app, async () => {
						await this.plugin.forage.clear();
						new Notice('Local store has been reset');
					}).open();
				});
			});

		new Setting(containerEl)
			.setName('Save all image to cache without compression')
			.setDesc(
				this.createFragmentWithHTML(
					'<b>This is a debug option!</b> If you are certain that all images are compressed and you have lost the cache file, you can use this option to temporarily recover the cache file.',
				),
			)
			.addButton((button) => {
				button.setButtonText('Reset').onClick(() => {
					new ConfirmModal(app, async () => {
						const allImages = getAllImages(plugin);
						for (const image of allImages) {
							await addImageToCache(plugin, image);
						}
						new Notice('All images have been added to the cache');
					}).open();
				});
			});

		new Setting(containerEl)
			.setName('Clear all images records from cache')
			.setDesc(
				this.createFragmentWithHTML(
					'<b>This is a debug and VERY DANGEROUS option!</b> You will lose all the records of the images that have been compressed. This will not delete the images themselves, but you will be compressing them again.',
				),
			)
			.addButton((button) => {
				button.setButtonText('Reset').onClick(() => {
					new ConfirmModal(app, async () => {
						await clearCache(plugin);
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
						await plugin.app.setting.close();
						new AddFolderModal(plugin, AddFolderMode.Allowed).open();
					});
				});

			for (const path of plugin.settings.allowedFolders) {
				const order = plugin.settings.allowedFolders.indexOf(path) + 1;

				let folderText = `${order}: <code>${path}</code>`;

				const folderInfo = this.plugin.app.vault.getFolderByPath(path);

				if (!folderInfo) {
					folderText += ' <strong>(Not found)</strong>';
				}

				new Setting(containerEl)
					.setName(this.createFragmentWithHTML(folderText))
					.addButton((btn) => {
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
		} else {
			containerEl.createEl('h2', { text: 'Ignored Folders' });

			new Setting(containerEl)
				.setName('Add')
				.setDesc('Add a folder to the ignored folders list')
				.addButton((button) => {
					button.setButtonText('Add').onClick(async () => {
						await plugin.app.setting.close();
						new AddFolderModal(plugin, AddFolderMode.Ignored).open();
					});
				});

			for (const path of plugin.settings.ignoredFolders) {
				const order = plugin.settings.ignoredFolders.indexOf(path) + 1;

				let folderText = `${order}: <code>${path}</code>`;

				const folderInfo = plugin.app.vault.getAbstractFileByPath(path);

				if (!folderInfo) {
					folderText += ' <strong>(Not found)</strong>';
				}

				new Setting(containerEl)
					.setName(
						this.createFragmentWithHTML(`${order}: <code>${path}</code>`),
					)
					.addButton((btn) => {
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
}
