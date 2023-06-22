export interface PluginSettings {
	apiKey: string;
	concurrency: number;
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
