import { Modal, Notice, Setting } from 'obsidian';

import manifest from '../../manifest.json';
import type AiPlugin from '../main';

export enum AddFolderMode {
	Allowed = 'allowed',
	Ignored = 'ignored',
}

export class AddFolderModal extends Modal {
	path: string;
	mode: AddFolderMode;
	plugin: AiPlugin;

	// Action sync function or async function
	constructor(plugin: AiPlugin, mode: AddFolderMode) {
		super(plugin.app);
		this.path = '';
		this.plugin = plugin;
		this.mode = mode;
	}

	getObject() {
		return this.mode === AddFolderMode.Allowed
			? this.plugin.settings.allowedFolders
			: this.plugin.settings.ignoredFolders;
	}

	async submitForm(): Promise<void> {
		if (this.path === '') {
			new Notice('Please fill out all fields');
			return;
		}

		// Check if path is already in ignored folders
		const result = this.getObject().includes(this.path);

		if (result) {
			new Notice(`Path already exists in ${this.mode} folders`);
			return;
		}

		// Check if path is valid
		const pathExists = await this.plugin.app.vault.adapter.exists(this.path);

		if (!pathExists) {
			new Notice('Path does not exist');
			return;
		}

		this.getObject().push(this.path);

		await this.plugin.saveSettings();

		new Notice(`Added ${this.path} to ${this.mode} folders`);

		this.close();
	}

	onOpen() {
		const { contentEl, path } = this;

		contentEl.createEl('h4', { text: `Add ${this.mode} Folder` });

		new Setting(contentEl).setName('Path:').addText((search) => {
			search.onChange((value) => {
				this.path = value;
			});
			search.setValue(path);
		});

		new Setting(contentEl).addButton((btn) =>
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
