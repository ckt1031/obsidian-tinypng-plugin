import { Modal, Notice, Setting } from 'obsidian';

import type TinyPngPlugin from '../main';

export enum AddFolderMode {
	Allowed = 'allowed',
	Ignored = 'ignored',
}

export class AddFolderModal extends Modal {
	path: string;
	mode: AddFolderMode;
	plugin: TinyPngPlugin;

	// Action sync function or async function
	constructor(plugin: TinyPngPlugin, mode: AddFolderMode) {
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

		const result = this.getObject().includes(this.path);

		if (result) {
			new Notice(`Path already exists in ${this.mode} folders`);
			return;
		}

		// Check if path is valid
		const pathExists = await this.plugin.app.vault.adapter.exists(
			this.path,
			true,
		);

		if (!pathExists) {
			new Notice('Path does not exist');
			return;
		}

		const folderInfo = this.plugin.app.vault.getFolderByPath(this.path);

		if (!folderInfo) {
			new Notice('Path is not a valid folder');
			return;
		}

		this.getObject().push(this.path);

		await this.plugin.saveSettings();

		new Notice(`Added ${this.path} to ${this.mode} folders`);

		this.close();
	}

	onOpen() {
		const { contentEl, path } = this;

		this.setTitle(`Add ${this.mode} Folder`);

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
		await plugin.app.setting.open();
		await plugin.app.setting.openTabById(plugin.manifest.id);
	}
}
