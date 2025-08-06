module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env'] }]
  },
  moduleNameMapper: {
    '^\\.(svg|png|jpg|jpeg|gif|eot|otf|ttf|woff|woff2)$': '<rootDir>/test/fileMock.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '@genkit-ai/mcp': '<rootDir>/test/context7Mock.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(some-module-to-transform)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  verbose: true,
  testTimeout: 10000
};