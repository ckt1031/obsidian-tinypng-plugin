import { Notice, type App, type TFile, request, requestUrl } from "obsidian";
import {
	CompressionStatus,
	ImageStatus,
	LocalStoreKey,
	PluginSettings,
} from "./types";
import { checkImageFromCache, addImageToCache } from "./cache";
import { defaultStore } from "./store";

export function getAllImages(app: App) {
	const files = app.vault.getFiles();

	// Get all images from the vault
	const images = files.filter((file) => {
		const extension = file.extension;
		return (
			extension === "png" || extension === "jpg" || extension === "jpeg"
		);
	});

	return images;
}

async function calculateSHA256Hash(buffer: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

	return hashHex;
}

async function compressSingle(apiKey: string, image: TFile) {
	try {
		// Get the hash of the original image
		const oldHash = await calculateSHA256Hash(
			await app.vault.readBinary(image)
		);

		// Check if the image is already compressed
		if (checkImageFromCache(oldHash)) {
			return ImageStatus.AlreadyCompressed;
		}

		const apiURL = "https://api.tinify.com/shrink";

		const data = await request({
			url: apiURL,
			method: "POST",
			headers: {
				Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
			},
			body: await app.vault.readBinary(image),
		});

		// Get the compressed image url from Location header and replace the original
		const compressedImageURL = JSON.parse(data).output.url;

		if (!compressedImageURL) {
			return ImageStatus.Failed;
		}

		const compressedImage = await requestUrl(compressedImageURL);
		const compressedImageArrayBuffer = compressedImage.arrayBuffer;

		await app.vault.modifyBinary(image, compressedImageArrayBuffer);

		const hash = await calculateSHA256Hash(compressedImageArrayBuffer);

		// Get the hash of the compressed image
		addImageToCache(hash);

		return ImageStatus.Compressed;
	} catch (error) {
		console.error(error);
		return ImageStatus.Failed;
	}
}

export async function compressImages(
	settings: PluginSettings,
	images: TFile[]
): Promise<void> {
	// Get the API key from the settings
	const apiKey: string | undefined = settings.apiKey;

	if (!apiKey) {
		new Notice("Please enter an API key in the settings.");
		return;
	}

	// Reject if compression is already in progress
	const compressionStatus: CompressionStatus | null =
		await defaultStore.getItem(LocalStoreKey.CompressionStatus);

	if (compressionStatus === CompressionStatus.Compressing) {
		new Notice("Compression is already in progress.");
		return;
	}

	// Set CompressionStatus to Compressing
	await defaultStore.setItem(
		LocalStoreKey.CompressionStatus,
		CompressionStatus.Compressing
	);

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
				.then((status) => {
					if (status === ImageStatus.Compressed) {
						successCount++;
					} else if (status === ImageStatus.AlreadyCompressed) {
						bypassedCount++;
					} else if (status === ImageStatus.Failed) {
						failedCount++;
					}
				})
				.catch((error) => {
					console.error(error);
					failedCount++;
				})
		);

		if (promises.length >= concurrency) {
			await Promise.all(promises);
			promises.length = 0;
		}
	}

	await Promise.all(promises);

	// Set CompressionStatus to idle
	await defaultStore.setItem(
		LocalStoreKey.CompressionStatus,
		CompressionStatus.Idle
	);

	new Notice(
		`Compression complete. Success: ${successCount}, Ignored: ${bypassedCount}, Failed: ${failedCount}`
	);
}
