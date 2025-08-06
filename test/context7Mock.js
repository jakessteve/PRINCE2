// Mock for @genkit-ai/mcp Context7 library
const mockContext7Service = {
  initialize: jest.fn().mockResolvedValue(undefined),
  trackDataAccess: jest.fn().mockResolvedValue(undefined),
  trackUserBehavior: jest.fn().mockResolvedValue(undefined),
  getRecommendations: jest.fn().mockResolvedValue([]),
  shutdown: jest.fn().mockResolvedValue(undefined)
};

const mockContext7Cache = {
  has: jest.fn().mockReturnValue(false),
  get: jest.fn().mockReturnValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  size: jest.fn().mockReturnValue(0)
};

const mockIntelligentPreloader = {
  startIntelligentPreloading: jest.fn().mockResolvedValue(undefined),
  stopIntelligentPreloading: jest.fn().mockResolvedValue(undefined),
  getPreloadStatus: jest.fn().mockReturnValue({ active: false, preloaded: [] })
};

// Mock the Context7 MCP library
module.exports = {
  createEntities: jest.fn(),
  createRelations: jest.fn(),
  addObservations: jest.fn(),
  readGraph: jest.fn(),
  searchNodes: jest.fn(),
  openNodes: jest.fn(),
  deleteEntities: jest.fn(),
  deleteObservations: jest.fn(),
  deleteRelations: jest.fn(),
  // Export our mock services
  context7Service: mockContext7Service,
  context7Cache: mockContext7Cache,
  intelligentPreloader: mockIntelligentPreloader
};