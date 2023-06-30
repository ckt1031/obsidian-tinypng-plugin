import { z } from 'zod';

export const PluginSettingsSchema = z.object({
	tinypngApiKey: z.string(),
	tinypngBaseUrl: z.string(),
	concurrency: z.number(),
	ignoredFolders: z.string().array(),
});

export const ObfuscatedPluginSettingsSchema = z.object({
	_NOTICE: z.string(),
	j: z.string(),
});

export type PluginSettings = z.infer<typeof PluginSettingsSchema>;

export type ObfuscatedPluginSettings = z.infer<typeof ObfuscatedPluginSettingsSchema>;

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
