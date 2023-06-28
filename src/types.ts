export interface PluginSettings {
	tinypngApiKey: string;
	tinypngBaseUrl: string;
	concurrency: number;
}

export interface ObfuscatedPluginSettings {
	_NOTICE: string;
	j: string;
}

export enum ImageStatus {
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
