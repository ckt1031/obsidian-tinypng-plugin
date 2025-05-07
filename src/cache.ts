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

	// Upgrade to new hash key if old key is found
	if (oldComparison) {
		// Remove old key to avoid duplication
		await plugin.removeImageCacheFromLocalFile(oldKey);
		await plugin.saveImageCacheToLocalFile(hash, ImageCacheStatus.Compressed);
	}

	return oldComparison || newComparison;
}

export async function addImageToCache(plugin: TinypngPlugin, file: TFile) {
	// New images are added to the cache with a hash key
	const hash = await getItemKeyByHash(file);
	await plugin.saveImageCacheToLocalFile(hash, ImageCacheStatus.Compressed);

	const imageCount = await plugin.forage.getItem<string>(
		LocalStoreKey.PENDING_COMPRESSION_COUNT,
	);

	if (!imageCount) return;

	const newImageCount = Number(imageCount) - 1;

	if (newImageCount > 0) {
		await plugin.forage.setItem(
			LocalStoreKey.PENDING_COMPRESSION_COUNT,
			newImageCount,
		);
		return;
	}

	await plugin.forage.removeItem(LocalStoreKey.PENDING_COMPRESSION_COUNT);
}

export async function clearCache(plugin: TinypngPlugin) {
	const cacheFilePath = await getCacheFilePath(plugin);
	await plugin.app.vault.adapter.write(cacheFilePath, '{}');
}
