import { Modal, Notice, Setting } from 'obsidian';

import manifest from '../../manifest.json';
import type AiPlugin from '../main';

export default class AddIgnoredFolderModal extends Modal {
	path: string;
	plugin: AiPlugin;

	// Action sync function or async function
	constructor(plugin: AiPlugin) {
		super(plugin.app);
		this.path = '';
		this.plugin = plugin;
	}

	async submitForm(): Promise<void> {
		if (this.path === '') {
			new Notice('Please fill out all fields');
			return;
		}

		// Check if path is already in ignored folders
		const result = this.plugin.settings.ignoredFolders.includes(this.path);

		if (result) {
			new Notice('Path already exists in ignored folders');
			return;
		}

		// Check if path is valid
		const pathExists = await this.plugin.app.vault.adapter.exists(this.path);

		if (!pathExists) {
			new Notice('Path does not exist');
			return;
		}

		this.plugin.settings.ignoredFolders.push(this.path);

		await this.plugin.saveSettings();

		new Notice(`Added ${this.path} to ignored folders`);

		this.close();
	}

	onOpen() {
		const { contentEl, path } = this;

		contentEl.createEl('h4', { text: 'Add Ignored Folder' });

		new Setting(contentEl).setName('Path:').addText(search => {
			search.onChange(value => {
				this.path = value;
			});
			search.setValue(path);
		});

		new Setting(contentEl).addButton(btn =>
			btn
				.setButtonText('Confirm')
				.setCta()
				.onClick(async () => {
					await this.submitForm();
				}),
		);
	}

	async onClose() {
		const { contentEl, plugin } = this;
		contentEl.empty();
		await (plugin as any).app.setting.open();
		await (plugin as any).app.setting.openTabById(manifest.id);
	}
}
