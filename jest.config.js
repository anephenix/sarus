module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  clearMocks: true,
  coverageDirectory: "coverage",
  transform: {
    "//.(ts|tsx)$": "<rootDir>/node_modules/ts-jest/preprocessor.js"
  }
};
