import * as v from 'valibot';

export const PluginSettingsSchema = v.object({
	tinypngApiKey: v.string(),
	tinypngBaseUrl: v.string(),
	concurrency: v.number(),
	compressAllowedFoldersOnly: v.boolean(),
	cacheFilePath: v.string(),
	allowedFolders: v.array(v.string()),
	ignoredFolders: v.array(v.string()),
	extraImageFormats: v.string(),
	/**
	 * Compress on new image file pasted into the editor,
	 * under constrains of allowed and disallowed folders.
	 */
	compressOnPaste: v.boolean(),
	/**
	 * Ignore other file compression settings,
	 * directly compress new files under constrains of allowed and disallowed folders.
	 *
	 * If the value is true, it will ignore `compressOnPaste`.
	 */
	compressOnFileSystemImageCreated: v.boolean(),
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
	Failed = 2,
}

export enum CompressionStatus {
	Idle = 0,
	Compressing = 1,
}

export enum LocalStoreKey {
	COMPRESSION_STATUS = 'compression-status',
	PENDING_COMPRESSION_COUNT = 'pending-compression-count',
}
