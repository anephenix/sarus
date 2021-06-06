module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	clearMocks: true,
	coverageDirectory: 'coverage',
	transform: {
		'//.(ts|tsx)$': 'ts-jest',
	},
	testPathIgnorePatterns: ['/__tests__/helpers/delay.ts'],
};
