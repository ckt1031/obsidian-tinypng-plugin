import type { TFile } from 'obsidian';

import { generateFileHash } from './crypto';
import type TinypngPlugin from './main';
import { ImageCacheStatus, LocalStoreKey } from './types';

export async function getCacheFilePath(plugin: TinypngPlugin) {
	// Check if the cache file path is set
	const cacheFileExists = await plugin.app.vault.adapter.exists(
		plugin.settings.cacheFilePath,
	);

	if (!cacheFileExists) {
		await plugin.app.vault.create(plugin.settings.cacheFilePath, '{}');
	}

	return plugin.settings.cacheFilePath;
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

export async function checkImageFromCache(plugin: TinypngPlugin, file: TFile) {
	const cache = plugin.imageHashes;

	// Remains compatible with version <= 0.2.0, will be removed in future versions
	const oldKey = getItemKeyByFileNameSize(file);
	const oldComparison = cache.get(oldKey) === ImageCacheStatus.Compressed;

	const hash = await getItemKeyByHash(file);
	const newComparison = cache.get(hash) === ImageCacheStatus.Compressed;

	return oldComparison || newComparison;
}

export async function addImageToCache(plugin: TinypngPlugin, file: TFile) {
	// New images are added to the cache with a hash key
	const hash = await getItemKeyByHash(file);
	await plugin.saveImageCacheToLocalFile(hash, ImageCacheStatus.Compressed);

	const imageCount: string | null = await plugin.forage.getItem(
		LocalStoreKey.ImagesNumberAwaitingCompression,
	);

	if (imageCount) {
		const newImageCount = Number(imageCount) - 1;

		await (newImageCount > 0
			? plugin.forage.setItem(
					LocalStoreKey.ImagesNumberAwaitingCompression,
					newImageCount,
				)
			: plugin.forage.removeItem(
					LocalStoreKey.ImagesNumberAwaitingCompression,
				));
	}
}

export async function clearCache(plugin: TinypngPlugin) {
	const cacheFilePath = await getCacheFilePath(plugin);
	await plugin.app.vault.adapter.write(cacheFilePath, '{}');
}
