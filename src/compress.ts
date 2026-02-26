import { Notice, type TFile, request, requestUrl } from 'obsidian';

import { addImageToCache, checkImageFromCache } from './cache';
import type TinypngPlugin from './main';
import {
	CompressionStatus,
	ImageCompressionProgressStatus,
	LocalStoreKey,
} from './types';

// Image ONLY
const defaultAllowedFormats = ['png', 'jpg', 'jpeg', 'webp'];

export function getAllImages(plugin: TinypngPlugin) {
	const files = plugin.app.vault.getFiles();

	// Get all images from the vault which are allowed
	return files.filter((file) => checkIsFileImageAndAllowed(plugin, file));
}

export function checkIsFileImage(plugin: TinypngPlugin, image: TFile) {
	const extension = image.extension.toLowerCase();
	const customFormats = plugin.settings.extraImageFormats
		.split(',')
		.map((format) => format.trim().toLowerCase())
		.filter((format) => format.length > 0);
	const isExtensionValid = [
		...customFormats,
		...defaultAllowedFormats,
	].includes(extension);

	return isExtensionValid;
}

export function checkIsImageInSpecificFolder(
	plugin: TinypngPlugin,
	image: TFile,
) {
	let status = plugin.settings.ignoredFolders.some((folder) => {
		return image.path.startsWith(folder);
	});

	// Check if the plugin in allow-only mode
	if (plugin.settings.compressAllowedFoldersOnly) {
		// Only compress images in the allowed folders
		status = !plugin.settings.allowedFolders.some((folder) => {
			return image.path.startsWith(folder);
		});
	}

	return !status;
}

export function checkIsFileImageAndAllowed(
	plugin: TinypngPlugin,
	image: TFile,
) {
	const isExtensionValid = checkIsFileImage(plugin, image);
	const isInSpecificFolder = checkIsImageInSpecificFolder(plugin, image);
	return isExtensionValid && isInSpecificFolder;
}

export async function compressSingle(
	plugin: TinypngPlugin,
	image: TFile,
	checkCompressed = true,
) {
	try {
		// Check if the image is already compressed
		if (checkCompressed && (await checkImageFromCache(plugin, image))) {
			return ImageCompressionProgressStatus.AlreadyCompressed;
		}

		const apiURL = `${plugin.settings.tinypngBaseUrl}/shrink`;

		const key = btoa(`api:${plugin.settings.tinypngApiKey}`);

		const data = await request({
			url: apiURL,
			method: 'POST',
			headers: {
				Authorization: `Basic ${key}`,
			},
			body: await plugin.app.vault.readBinary(image),
		});

		// Get the compressed image url from Location header and replace the original
		const compressedImageURL: string = JSON.parse(data).output.url;

		if (!compressedImageURL) {
			return ImageCompressionProgressStatus.Failed;
		}

		const compressedImage = await requestUrl(compressedImageURL);

		// Re-write the image file
		await plugin.app.vault.modifyBinary(image, compressedImage.arrayBuffer);

		// Add the image to the cache
		await addImageToCache(plugin, image);

		return ImageCompressionProgressStatus.Compressed;
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message);
		}
		return ImageCompressionProgressStatus.Failed;
	}
}

export async function compressImages(
	plugin: TinypngPlugin,
	images: TFile[],
): Promise<void> {
	// Get the API key from the settings
	const apiKey: string | undefined = plugin.settings.tinypngApiKey;

	if (!apiKey) {
		new Notice('Please enter an API key in the settings.');
		return;
	}

	// Reject if compression is already in progress
	const compressionStatus: CompressionStatus | null =
		await plugin.forage.getItem(LocalStoreKey.COMPRESSION_STATUS);

	if (compressionStatus === CompressionStatus.Compressing) {
		const imageCount = await plugin.forage.getItem<string>(
			LocalStoreKey.PENDING_COMPRESSION_COUNT,
		);

		new Notice(
			imageCount
				? `There are ${imageCount} images awaiting compression.`
				: 'Compression is already in progress.',
		);
		return;
	}

	// Set CompressionStatus to Compressing
	await plugin.forage.setItem(
		LocalStoreKey.COMPRESSION_STATUS,
		CompressionStatus.Compressing,
	);

	// Set the images to be compressed
	await plugin.forage.setItem(
		LocalStoreKey.PENDING_COMPRESSION_COUNT,
		images.length,
	);

	// Get the concurrency from the settings
	const concurrency: number | undefined = plugin.settings.concurrency;

	let successCount = 0;
	let bypassedCount = 0;
	let failedCount = 0;

	// Compress each image with the concurrency limit and promise
	const promises: Promise<void>[] = [];

	for (const image of images) {
		promises.push(
			compressSingle(plugin, image)
				.then((status) => {
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
				.catch((error) => {
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
	await plugin.forage.setItem(
		LocalStoreKey.COMPRESSION_STATUS,
		CompressionStatus.Idle,
	);

	new Notice(
		`Compression complete. Success: ${successCount}, Ignored: ${bypassedCount}, Failed: ${failedCount}`,
	);
}
