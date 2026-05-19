module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['dotenv/config'],
  testEnvironmentOptions: {
    env: { NODE_ENV: 'test' },
  },
};
