/* eslint-disable unicorn/prefer-node-protocol */
import * as fs from 'fs';
import type { TFile } from 'obsidian';
// eslint-disable-next-line unicorn/import-style
import * as path from 'path';

import { CACHE_JSON_FILE } from './config';

function getCachePath() {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
	const vaultPath = app.vault.adapter.basePath as string;

	// Get path with Windows, Linux, and Mac support
	return path.join(vaultPath, CACHE_JSON_FILE);
}

function createCacheFile() {
	const cacheFilePath = getCachePath();

	if (!fs.existsSync(cacheFilePath)) {
		fs.writeFileSync(cacheFilePath, '{}');
	}
}

function getItemKey(item: TFile) {
	return encodeURIComponent(item.name) + String(item.stat.size);
}

export function checkImageFromCache(file: TFile) {
	createCacheFile();

	const cacheFilePath = getCachePath();

	const cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));

	return cache[getItemKey(file)] ? true : false;
}

export function addImageToCache(file: TFile) {
	createCacheFile();

	const cacheFilePath = getCachePath();

	const cache = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));

	cache[getItemKey(file)] = true;

	fs.writeFileSync(cacheFilePath, JSON.stringify(cache));
}
