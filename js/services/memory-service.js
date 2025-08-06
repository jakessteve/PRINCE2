/**
 * Browser-compatible memory service for knowledge graph operations
 * Replaces @genkit-ai/mcp functionality for browser environments
 */

// In-memory storage for the knowledge graph
const memoryStore = {
    entities: new Map(),
    relations: new Map(),
    observations: new Map()
};

// Helper functions
const generateId = () => Math.random().toString(36).substr(2, 9);

// Entity management
export const createEntities = async (entities) => {
    console.log('🧠 Memory Service: Creating entities', entities);
    
    for (const entity of entities) {
        const entityId = generateId();
        const entityWithId = {
            id: entityId,
            name: entity.name,
            entityType: entity.entityType,
            observations: entity.observations || [],
            createdAt: new Date().toISOString()
        };
        
        memoryStore.entities.set(entityId, entityWithId);
        
        // Create observations if provided
        if (entity.observations && entity.observations.length > 0) {
            await addObservations([{
                entityName: entity.name,
                contents: entity.observations
            }]);
        }
    }
    
    return Array.from(memoryStore.entities.values());
};

export const createRelations = async (relations) => {
    console.log('🔗 Memory Service: Creating relations', relations);
    
    for (const relation of relations) {
        const relationId = generateId();
        const relationWithId = {
            id: relationId,
            from: relation.from,
            to: relation.to,
            relationType: relation.relationType,
            createdAt: new Date().toISOString()
        };
        
        memoryStore.relations.set(relationId, relationWithId);
    }
    
    return Array.from(memoryStore.relations.values());
};

export const addObservations = async (observations) => {
    console.log('📝 Memory Service: Adding observations', observations);
    
    for (const observation of observations) {
        // Find entity by name
        let entity = Array.from(memoryStore.entities.values())
            .find(e => e.name === observation.entityName);
        
        // If entity doesn't exist, create it
        if (!entity) {
            const entityId = generateId();
            entity = {
                id: entityId,
                name: observation.entityName,
                entityType: 'Unknown',
                observations: [],
                createdAt: new Date().toISOString()
            };
            memoryStore.entities.set(entityId, entity);
        }
        
        // Add observations to the entity
        for (const content of observation.contents) {
            const observationId = generateId();
            const observationObj = {
                id: observationId,
                entityId: entity.id,
                content,
                timestamp: new Date().toISOString()
            };
            
            memoryStore.observations.set(observationId, observationObj);
            
            // Add to entity's observations array
            entity.observations.push(observationId);
        }
    }
    
    return Array.from(memoryStore.observations.values());
};

export const readGraph = async () => {
    console.log('📊 Memory Service: Reading graph');
    
    return {
        entities: Array.from(memoryStore.entities.values()),
        relations: Array.from(memoryStore.relations.values()),
        observations: Array.from(memoryStore.observations.values())
    };
};

export const searchNodes = async (query) => {
    console.log('🔍 Memory Service: Searching nodes', query);
    
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Search entities
    for (const entity of memoryStore.entities.values()) {
        if (entity.name.toLowerCase().includes(lowerQuery) || 
            entity.entityType.toLowerCase().includes(lowerQuery)) {
            results.push({
                type: 'entity',
                data: entity
            });
        }
    }
    
    // Search observations
    for (const observation of memoryStore.observations.values()) {
        if (observation.content.toLowerCase().includes(lowerQuery)) {
            results.push({
                type: 'observation',
                data: observation
            });
        }
    }
    
    return results;
};

export const openNodes = async (names) => {
    console.log('📂 Memory Service: Opening nodes', names);
    
    const results = [];
    
    for (const name of names) {
        const entity = Array.from(memoryStore.entities.values())
            .find(e => e.name === name);
        
        if (entity) {
            results.push(entity);
        }
    }
    
    return results;
};

export const deleteEntities = async (names) => {
    console.log('🗑️ Memory Service: Deleting entities', names);
    
    for (const name of names) {
        // Find entity by name
        const entity = Array.from(memoryStore.entities.values())
            .find(e => e.name === name);
        
        if (entity) {
            // Delete entity
            memoryStore.entities.delete(entity.id);
            
            // Delete related observations
            for (const [observationId, observation] of memoryStore.observations) {
                if (observation.entityId === entity.id) {
                    memoryStore.observations.delete(observationId);
                }
            }
            
            // Delete related relations
            for (const [relationId, relation] of memoryStore.relations) {
                if (relation.from === name || relation.to === name) {
                    memoryStore.relations.delete(relationId);
                }
            }
        }
    }
    
    return true;
};

export const deleteObservations = async (deletions) => {
    console.log('🗑️ Memory Service: Deleting observations', deletions);
    
    for (const deletion of deletions) {
        for (const content of deletion.observations) {
            // Find observation by content and entity name
            for (const [observationId, observation] of memoryStore.observations) {
                if (observation.content === content && 
                    observation.entityId === memoryStore.entities.get(
                        Array.from(memoryStore.entities.values())
                            .find(e => e.name === deletion.entityName)?.id
                    )?.id) {
                    memoryStore.observations.delete(observationId);
                    break;
                }
            }
        }
    }
    
    return true;
};

export const deleteRelations = async (relations) => {
    console.log('🗑️ Memory Service: Deleting relations', relations);
    
    for (const relation of relations) {
        for (const [relationId, existingRelation] of memoryStore.relations) {
            if (existingRelation.from === relation.from && 
                existingRelation.to === relation.to && 
                existingRelation.relationType === relation.relationType) {
                memoryStore.relations.delete(relationId);
                break;
            }
        }
    }
    
    return true;
};

// Export utility functions for debugging
export const memoryService = {
    getStore: () => memoryStore,
    clear: () => {
        memoryStore.entities.clear();
        memoryStore.relations.clear();
        memoryStore.observations.clear();
    },
    size: () => ({
        entities: memoryStore.entities.size,
        relations: memoryStore.relations.size,
        observations: memoryStore.observations.size
    })
};