import type { App, TFile } from 'obsidian';

import { CACHE_JSON_FILE } from './config';
import store from './store';
import { ImageCacheStatus, LocalStoreKey } from './types';

async function createCacheFile(app: App) {
	const cacheFileExists = await app.vault.adapter.exists(CACHE_JSON_FILE);

	if (!cacheFileExists) {
		await app.vault.create(CACHE_JSON_FILE, '{}');
	}
}

function getItemKey(item: TFile) {
	// NO need to store the path, the name and size is ok to identify the unique file
	// Example: selfie.jpg (2000 bytes)
	// Key: selfie.jpg_2000
	return encodeURIComponent(item.name) + '-' + String(item.stat.size);
}

export async function checkImageFromCache(app: App, file: TFile) {
	await createCacheFile(app);

	const cacheFile = await app.vault.adapter.read(CACHE_JSON_FILE);

	const cache: Record<string, ImageCacheStatus | undefined> =
		JSON.parse(cacheFile);

	return cache[getItemKey(file)] === ImageCacheStatus.Compressed;
}

export async function addImageToCache(file: TFile) {
	await createCacheFile(app);

	const cacheFile = await app.vault.adapter.read(CACHE_JSON_FILE);

	const cache = JSON.parse(cacheFile);

	cache[getItemKey(file)] = ImageCacheStatus.Compressed;

	await app.vault.adapter.write(CACHE_JSON_FILE, JSON.stringify(cache));

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

export async function clearCache() {
	await app.vault.adapter.write(CACHE_JSON_FILE, '{}');
}
