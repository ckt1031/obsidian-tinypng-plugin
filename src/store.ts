class LocalStore {
	set<T>(key: string, value: T): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.error('Error saving to localStorage', error);
		}
	}

	get<T>(key: string): T | null {
		try {
			const storedValue = localStorage.getItem(key);
			if (storedValue) {
				return JSON.parse(storedValue) as T;
			}
			return null;
		} catch (error) {
			console.error('Error getting data from localStorage', error);
			return null;
		}
	}

	remove(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error('Error removing data from localStorage', error);
		}
	}

	clear(): void {
		try {
			localStorage.clear();
		} catch (error) {
			console.error('Error clearing localStorage', error);
		}
	}
}

export default new LocalStore();
