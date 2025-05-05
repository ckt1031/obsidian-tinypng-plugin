import * as v from 'valibot';

export const PluginSettingsSchema = v.object({
	tinypngApiKey: v.string(),
	tinypngBaseUrl: v.string(),
	concurrency: v.number(),
	compressAllowedFoldersOnly: v.boolean(),
	cacheFilePath: v.string(),
	allowedFolders: v.array(v.string()),
	ignoredFolders: v.array(v.string()),
});

export const ObfuscatedPluginSettingsSchema = v.object({
	_NOTICE: v.string(),
	j: v.string(),
});

export type PluginSettings = v.InferInput<typeof PluginSettingsSchema>;

export type ObfuscatedPluginSettings = v.InferInput<
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
