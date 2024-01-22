import type { App, TFile } from 'obsidian';

import store from './store';
import { ImageCacheStatus, LocalStoreKey, PluginSettings } from './types';

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

function getItemKey(item: TFile) {
	// NO need to store the path, the name and size is ok to identify the unique file
	// Example: selfie.jpg (2000 bytes)
	// Key: selfie.jpg_2000
	return `${encodeURIComponent(item.name)}-${String(item.stat.size)}`;
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

	return cache[getItemKey(file)] === ImageCacheStatus.Compressed;
}

export async function addImageToCache(
	app: App,
	settings: PluginSettings,
	file: TFile,
) {
	const cacheFilePath = await getCacheFilePath(app, settings);
	const cacheFile = await app.vault.adapter.read(cacheFilePath);

	const cache = JSON.parse(cacheFile);

	cache[getItemKey(file)] = ImageCacheStatus.Compressed;

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
