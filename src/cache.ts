import * as fs from "fs";
import * as path from "path";
import { CACHE_JSON_FILE } from "./config";

function getCachePath() {
	// @ts-expect-error
	const vaultPath = app.vault.adapter.basePath as string;

	// Get path with Windows, Linux, and Mac support
	const cacheFilePath = path.join(vaultPath, CACHE_JSON_FILE);

	return cacheFilePath;
}

function createCacheFile() {
	const cacheFilePath = getCachePath();

	if (!fs.existsSync(cacheFilePath)) {
		fs.writeFileSync(cacheFilePath, "{}");
	}
}

export function checkImageFromCache(hash: string) {
	createCacheFile();

	const cacheFilePath = getCachePath();

	const cache = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));

	return cache[hash] ? true : false;
}

export function addImageToCache(hash: string) {
	createCacheFile();

	const cacheFilePath = getCachePath();

	const cache = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));

	cache[hash] = true;

	fs.writeFileSync(cacheFilePath, JSON.stringify(cache));
}
