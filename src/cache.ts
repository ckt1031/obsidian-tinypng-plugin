import type { App, TFile } from 'obsidian';

import { CACHE_JSON_FILE } from './config';
import { defaultStore } from './store';
import { LocalStoreKey } from './types';

async function createCacheFile(app: App) {
	const cacheFileExists = await app.vault.adapter.exists(CACHE_JSON_FILE);

	if (!cacheFileExists) {
		await app.vault.create(CACHE_JSON_FILE, '{}');
	}
}

function getItemKey(item: TFile) {
	return encodeURIComponent(item.name) + String(item.stat.size);
}

export async function checkImageFromCache(app: App, file: TFile) {
	await createCacheFile(app);

	const cacheFile = await app.vault.adapter.read(CACHE_JSON_FILE);

	const cache = JSON.parse(cacheFile);

	return cache[getItemKey(file)] ? true : false;
}

export async function addImageToCache(file: TFile) {
	await createCacheFile(app);

	const cacheFile = await app.vault.adapter.read(CACHE_JSON_FILE);

	const cache = JSON.parse(cacheFile);

	cache[getItemKey(file)] = true;

	await app.vault.adapter.write(CACHE_JSON_FILE, JSON.stringify(cache));

	const imageCount: string | null = await defaultStore.getItem(
		LocalStoreKey.ImagesNumberAwaitingCompression,
	);

	if (imageCount) {
		const newImageCount = Number(imageCount) - 1;

		await (newImageCount > 0
			? defaultStore.setItem(LocalStoreKey.ImagesNumberAwaitingCompression, newImageCount)
			: defaultStore.removeItem(LocalStoreKey.ImagesNumberAwaitingCompression));
	}
}
