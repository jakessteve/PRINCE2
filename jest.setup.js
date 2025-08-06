// Mock global objects for testing
global.fetch = jest.fn();
global.performance = {
    now: jest.fn(() => Date.now())
};

// Mock window object
global.window = {
    requestAnimationFrame: jest.fn(callback => callback()),
    cancelAnimationFrame: jest.fn()
};

// Mock history
global.history = {
    pushState: jest.fn(),
    replaceState: jest.fn()
};