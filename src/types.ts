import { array, number, object, type Output, string, boolean } from 'valibot';

export const PluginSettingsSchema = object({
	tinypngApiKey: string(),
	tinypngBaseUrl: string(),
	concurrency: number(),
	compressAllowedFoldersOnly: boolean(),
	allowedFolders: array(string()),
	ignoredFolders: array(string()),
});

export const ObfuscatedPluginSettingsSchema = object({
	_NOTICE: string(),
	j: string(),
});

export type PluginSettings = Output<typeof PluginSettingsSchema>;

export type ObfuscatedPluginSettings = Output<
	typeof ObfuscatedPluginSettingsSchema
>;

export enum ImageCacheStatus {
	Compressed = 1,
}

export enum ImageCompressionProgressStatus {
	Compressed = 0,
	AlreadyCompressed = 1,
	Failed = 99,
}

export enum CompressionStatus {
	Idle = 0,
	Compressing = 1,
}

export enum LocalStoreKey {
	CompressionStatus = 'compressionStatus',
	ImagesNumberAwaitingCompression = 'imagesNumberAwaitingCompression',
}
