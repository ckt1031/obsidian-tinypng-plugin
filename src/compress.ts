import { type App, Notice, request, requestUrl, type TFile } from 'obsidian';

import { addImageToCache, checkImageFromCache } from './cache';
import { defaultStore } from './store';
import type { PluginSettings } from './types';
import { CompressionStatus, ImageStatus, LocalStoreKey } from './types';

export function getAllImages(app: App) {
	const files = app.vault.getFiles();

	// Get all images from the vault
	return files.filter(file => {
		const extension = file.extension;
		return extension === 'png' || extension === 'jpg' || extension === 'jpeg';
	});
}

async function compressSingle(apiKey: string, image: TFile) {
	console.log(image);

	try {
		// Check if the image is already compressed
		if (checkImageFromCache(image)) {
			return ImageStatus.AlreadyCompressed;
		}

		const apiURL = 'https://api.tinify.com/shrink';

		const key = btoa(`api:${apiKey}`);

		const data = await request({
			url: apiURL,
			method: 'POST',
			headers: {
				Authorization: `Basic ${key}`,
			},
			body: await app.vault.readBinary(image),
		});

		// Get the compressed image url from Location header and replace the original
		const compressedImageURL: string = JSON.parse(data).output.url;

		if (!compressedImageURL) {
			return ImageStatus.Failed;
		}

		const compressedImage = await requestUrl(compressedImageURL);

		await app.vault.modifyBinary(image, compressedImage.arrayBuffer);

		// Get the hash of the compressed image
		addImageToCache(image);

		return ImageStatus.Compressed;
	} catch (error) {
		console.error(error);
		return ImageStatus.Failed;
	}
}

export async function compressImages(settings: PluginSettings, images: TFile[]): Promise<void> {
	// Get the API key from the settings
	const apiKey: string | undefined = settings.apiKey;

	if (!apiKey) {
		new Notice('Please enter an API key in the settings.');
		return;
	}

	// Reject if compression is already in progress
	const compressionStatus: CompressionStatus | null = await defaultStore.getItem(
		LocalStoreKey.CompressionStatus,
	);

	if (compressionStatus === CompressionStatus.Compressing) {
		new Notice('Compression is already in progress.');
		return;
	}

	// Set CompressionStatus to Compressing
	await defaultStore.setItem(LocalStoreKey.CompressionStatus, CompressionStatus.Compressing);

	// Get the concurrency from the settings
	const concurrency: number | undefined = settings.concurrency;

	let successCount = 0;
	let bypassedCount = 0;
	let failedCount = 0;

	// Compress each image with the concurrency limit and promise
	const promises: Promise<void>[] = [];

	for (const image of images) {
		promises.push(
			compressSingle(apiKey, image)
				.then(status => {
					switch (status) {
						case ImageStatus.Compressed: {
							successCount++;

							break;
						}
						case ImageStatus.AlreadyCompressed: {
							bypassedCount++;

							break;
						}
						case ImageStatus.Failed: {
							failedCount++;

							break;
						}
						// No default
					}
				})
				.catch(error => {
					console.error(error);
					failedCount++;
				}),
		);

		if (promises.length >= concurrency) {
			await Promise.all(promises);
			promises.length = 0;
		}
	}

	await Promise.all(promises);

	// Set CompressionStatus to idle
	await defaultStore.setItem(LocalStoreKey.CompressionStatus, CompressionStatus.Idle);

	new Notice(
		`Compression complete. Success: ${successCount}, Ignored: ${bypassedCount}, Failed: ${failedCount}`,
	);
}
