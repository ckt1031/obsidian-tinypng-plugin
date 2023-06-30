import { Notice, request, requestUrl, type TFile } from 'obsidian';

import { addImageToCache, checkImageFromCache } from './cache';
import type TinypngPlugin from './main';
import store from './store';
import type { PluginSettings } from './types';
import { CompressionStatus, ImageCompressionProgressStatus, LocalStoreKey } from './types';

export function getAllImages(plugin: TinypngPlugin) {
	const files = plugin.app.vault.getFiles();

	// Get all images from the vault
	return files.filter(file => {
		const extension = file.extension;
		const isExtensionValid = extension === 'png' || extension === 'jpg' || extension === 'jpeg';

		const isIgnored = plugin.settings.ignoredFolders.some(folder => {
			return file.path.startsWith(folder);
		});

		return isExtensionValid && !isIgnored;
	});
}

async function compressSingle(settings: PluginSettings, image: TFile) {
	try {
		// Check if the image is already compressed
		if (await checkImageFromCache(app, image)) {
			return ImageCompressionProgressStatus.AlreadyCompressed;
		}

		const apiURL = `${settings.tinypngBaseUrl}/shrink`;

		const key = btoa(`api:${settings.tinypngApiKey}`);

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
			return ImageCompressionProgressStatus.Failed;
		}

		const compressedImage = await requestUrl(compressedImageURL);

		await app.vault.modifyBinary(image, compressedImage.arrayBuffer);

		// Add the image to the cache
		await addImageToCache(image);

		return ImageCompressionProgressStatus.Compressed;
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
		}
		return ImageCompressionProgressStatus.Failed;
	}
}

export async function compressImages(settings: PluginSettings, images: TFile[]): Promise<void> {
	// Get the API key from the settings
	const apiKey: string | undefined = settings.tinypngApiKey;

	if (!apiKey) {
		new Notice('Please enter an API key in the settings.');
		return;
	}

	// Reject if compression is already in progress
	const compressionStatus: CompressionStatus | null = await store.getItem(
		LocalStoreKey.CompressionStatus,
	);

	if (compressionStatus === CompressionStatus.Compressing) {
		const imageCount: string | null = await store.getItem(
			LocalStoreKey.ImagesNumberAwaitingCompression,
		);

		new Notice(
			imageCount
				? `There are ${imageCount} images awaiting compression.`
				: 'Compression is already in progress.',
		);
		return;
	}

	// Set CompressionStatus to Compressing
	await store.setItem(LocalStoreKey.CompressionStatus, CompressionStatus.Compressing);

	// Set the images to be compressed
	await store.setItem(LocalStoreKey.ImagesNumberAwaitingCompression, images.length);

	// Get the concurrency from the settings
	const concurrency: number | undefined = settings.concurrency;

	let successCount = 0;
	let bypassedCount = 0;
	let failedCount = 0;

	// Compress each image with the concurrency limit and promise
	const promises: Promise<void>[] = [];

	for (const image of images) {
		promises.push(
			compressSingle(settings, image)
				.then(status => {
					switch (status) {
						case ImageCompressionProgressStatus.Compressed: {
							successCount++;

							break;
						}
						case ImageCompressionProgressStatus.AlreadyCompressed: {
							bypassedCount++;

							break;
						}
						case ImageCompressionProgressStatus.Failed: {
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
	await store.setItem(LocalStoreKey.CompressionStatus, CompressionStatus.Idle);

	new Notice(
		`Compression complete. Success: ${successCount}, Ignored: ${bypassedCount}, Failed: ${failedCount}`,
	);
}
