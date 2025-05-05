import type { App, TFile } from 'obsidian';

import { generateFileHash } from './crypto';
import store from './store';
import { ImageCacheStatus, LocalStoreKey, type PluginSettings } from './types';

async function getCacheFilePath(app: App, settings: PluginSettings) {
	// Check if the cache file path is set
	const cacheFileExists = await app.vault.adapter.exists(
		settings.cacheFilePath,
	);

	if (!cacheFileExists) {
		await app.vault.create(settings.cacheFilePath, '{}');
	}

	return settings.cacheFilePath;
}

/**
 * Remains compatible with version <= `0.2.0`
 */
function getItemKeyByFileNameSize(item: TFile) {
	// Example: selfie.jpg (2000 bytes)
	// Key: selfie.jpg_2000
	return `${encodeURIComponent(item.name)}-${String(item.stat.size)}`;
}

/**
 * Added since `0.3.0`
 */
async function getItemKeyByHash(item: TFile) {
	const binary = await item.vault.readBinary(item);
	const uint8Array = new Uint8Array(binary);
	return await generateFileHash(uint8Array);
}

export async function checkImageFromCache(
	app: App,
	settings: PluginSettings,
	file: TFile,
) {
	const cacheFilePath = await getCacheFilePath(app, settings);
	const cacheFile = await app.vault.adapter.read(cacheFilePath);

	const cache: Record<string, ImageCacheStatus | undefined> =
		JSON.parse(cacheFile);

	// Remains compatible with version <= 0.2.0, will be removed in future versions
	const oldKey = getItemKeyByFileNameSize(file);
	const oldComparison = cache[oldKey] === ImageCacheStatus.Compressed;

	const hash = await getItemKeyByHash(file);
	const newComparison = cache[hash] === ImageCacheStatus.Compressed;

	return oldComparison || newComparison;
}

export async function addImageToCache(
	app: App,
	settings: PluginSettings,
	file: TFile,
) {
	const cacheFilePath = await getCacheFilePath(app, settings);
	const cacheFile = await app.vault.adapter.read(cacheFilePath);

	const cache = JSON.parse(cacheFile);

	// New images are added to the cache with a hash key
	const hash = await getItemKeyByHash(file);
	cache[hash] = ImageCacheStatus.Compressed;

	await app.vault.adapter.write(cacheFilePath, JSON.stringify(cache));

	const imageCount: string | null = await store.getItem(
		LocalStoreKey.ImagesNumberAwaitingCompression,
	);

	if (imageCount) {
		const newImageCount = Number(imageCount) - 1;

		await (newImageCount > 0
			? store.setItem(
					LocalStoreKey.ImagesNumberAwaitingCompression,
					newImageCount,
				)
			: store.removeItem(LocalStoreKey.ImagesNumberAwaitingCompression));
	}
}

export async function clearCache(app: App, settings: PluginSettings) {
	const cacheFilePath = await getCacheFilePath(app, settings);
	await app.vault.adapter.write(cacheFilePath, '{}');
}
