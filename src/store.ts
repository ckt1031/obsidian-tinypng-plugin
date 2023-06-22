import * as localforage from 'localforage';

export const defaultStore = localforage.createInstance({
	name: 'defaultStore',
});
