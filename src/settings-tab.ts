import type { App } from 'obsidian';
import { Notice, PluginSettingTab, Setting } from 'obsidian';

import type TinypngPlugin from './main';
import store from './store';

export class SettingTab extends PluginSettingTab {
	plugin: TinypngPlugin;

	constructor(app: App, plugin: TinypngPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private static createFragmentWithHTML = (html: string) =>
		createFragment(documentFragment => (documentFragment.createDiv().innerHTML = html));

	display(): void {
		const { containerEl, plugin } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'General Configurations:' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc(
				SettingTab.createFragmentWithHTML(
					'API Key for the tinypng service, you can get one <a href="https://tinify.com/dashboard/api" target="_blank">here</a>',
				),
			)
			.addText(text =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(plugin.settings.apiKey)
					.onChange(async value => {
						plugin.settings.apiKey = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Concurrency')
			.setDesc('Number of images to compress at once')
			.addDropdown(dropdown => {
				dropdown
					.addOption('1', '1')
					.addOption('5', '5 (Default)')
					.addOption('10', '10')
					.addOption('20', '20')
					.addOption('50', '50 (High CPU Usage)')
					.setValue(plugin.settings.concurrency.toString())
					.onChange(async value => {
						plugin.settings.concurrency = Number.parseInt(value);
						await plugin.saveSettings();
					});
			});

		containerEl.createEl('h2', { text: 'Debug Configurations:' });

		// Add a button to reset the local store
		new Setting(containerEl)
			.setName('Reset Local Store')
			.setDesc('This will reset the local store, which can fix some temporary issues.')
			.addButton(button => {
				button.setButtonText('Reset').onClick(() => {
					store.clear();
					new Notice('Local store has been reset');
				});
			});
	}
}
