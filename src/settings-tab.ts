import { App, PluginSettingTab, Setting } from 'obsidian';
import TinypngPlugin from './main';

export class SettingTab extends PluginSettingTab {
	plugin: TinypngPlugin;

	constructor(app: App, plugin: TinypngPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Plugin Configurations:' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('API Key for the tinypng service')
			.addText(text =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async value => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Concurrency')
			.setDesc('Number of images to compress at once')
			.addDropdown(dropdown => {
				dropdown
					.addOption('1', '1')
					.addOption('5', '5 (Default)')
					.addOption('10', '3')
					.addOption('20', '4')
					.setValue(this.plugin.settings.concurrency.toString())
					.onChange(async value => {
						this.plugin.settings.concurrency = parseInt(value);
						await this.plugin.saveSettings();
					});
			});
	}
}
