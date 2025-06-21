module.exports = {
	preset: 'ts-jest/presets/default-esm',
	extensionsToTreatAsEsm: ['.ts'],
	testEnvironment: 'jsdom',
	clearMocks: true,
	coverageDirectory: 'coverage',
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { useESM: true }],
	},
	testPathIgnorePatterns: ['/__tests__/helpers/delay.ts'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1', // 👈 key fix: remove `.js` at runtime in Jest
	},
};