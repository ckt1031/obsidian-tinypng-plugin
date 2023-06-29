import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export default class ConfirmModal extends Modal {
	onConfirm: () => void | Promise<void>;
	onCancel?: () => void | Promise<void>;

	// Action sync function or async function
	constructor(
		app: App,
		onConfirm: () => void | Promise<void>,
		onCancel?: () => void | Promise<void>,
	) {
		super(app);
		this.onConfirm = onConfirm;
		if (onCancel) this.onCancel = onCancel;
	}

	onOpen() {
		const { contentEl, onCancel } = this;
		contentEl.setText('Are you sure you want to proceed?');

		new Setting(contentEl).addButton(btn =>
			btn
				.setButtonText('Confirm')
				.setCta()
				.onClick(async () => {
					this.close();
					await this.onConfirm();
				}),
		);

		new Setting(contentEl).addButton(btn =>
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
