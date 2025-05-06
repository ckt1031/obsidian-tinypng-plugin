import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export default class ConfirmModal extends Modal {
	onConfirm: () => void | Promise<void>;
	onCancel?: () => void | Promise<void>;
	warningMessage: string;

	// Action sync function or async function
	constructor(
		app: App,
		onConfirm: () => void | Promise<void>,
		onCancel?: () => void | Promise<void>,
		warningMessage = 'This action cannot be undone, please confirm to proceed.',
	) {
		super(app);
		this.onConfirm = onConfirm;
		if (onCancel) this.onCancel = onCancel;
		this.warningMessage = warningMessage;
	}

	onOpen() {
		const { contentEl, onCancel } = this;

		this.setTitle('Are you sure you want to proceed?');

		contentEl.createEl('p', {
			text: this.warningMessage,
		});

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Confirm')
					.setCta()
					.onClick(async () => {
						this.close();
						await this.onConfirm();
					}),
			)
			.addButton((btn) =>
				btn
					.setButtonText('Cancel')
					.setCta()
					.onClick(async () => {
						this.close();
						if (onCancel) await onCancel();
					}),
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
