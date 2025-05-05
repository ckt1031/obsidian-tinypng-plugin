import { describe, expect, it } from 'vitest';
import { generateFileHash } from '../src/crypto';

describe('SHA-256 Hashing', () => {
	it('should generate a valid SHA-256 hash', async () => {
		const text = 'Hello';
		const data = new TextEncoder().encode(text);
		const hash = await generateFileHash(data);

		// Obtained from `echo -n Hello | sha256sum` command on Linux
		expect(hash).toEqual(
			'185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969',
		);
	});
});
