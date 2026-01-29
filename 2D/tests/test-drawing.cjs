/**
 * Unit Tests for Drawing Functions
 * Tests core drawing and shape creation
 */

const assert = require('assert');

// Mock shapes storage
const MockShapes = {
    shapes: [],

    createShape: (type, data) => {
        const shape = {
            type,
            id: Date.now() + Math.random(),
            created: new Date(),
            ...data
        };
        MockShapes.shapes.push(shape);
        return shape;
    },

    getShape: (id) => {
        return MockShapes.shapes.find(s => s.id === id);
    },

    deleteShape: (id) => {
        MockShapes.shapes = MockShapes.shapes.filter(s => s.id !== id);
    },

    clear: () => {
        MockShapes.shapes = [];
    }
};

// Drawing validators
const DrawingValidators = {
    isValidPoint: (p) => {
        return p && typeof p === 'object' &&
               typeof p.x === 'number' &&
               typeof p.y === 'number';
    },

    isValidLine: (line) => {
        return line.type === 'line' &&
               DrawingValidators.isValidPoint(line.p1) &&
               DrawingValidators.isValidPoint(line.p2);
    },

    isValidCircle: (circle) => {
        return circle.type === 'circle' &&
               DrawingValidators.isValidPoint(circle.center) &&
               typeof circle.radius === 'number' &&
               circle.radius > 0;
    },

    isValidArc: (arc) => {
        return arc.type === 'arc' &&
               DrawingValidators.isValidPoint(arc.center) &&
               typeof arc.radius === 'number' &&
               typeof arc.startAngle === 'number' &&
               typeof arc.endAngle === 'number';
    },

    calculateLineLength: (p1, p2) => {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    },

    calculateArcLength: (radius, startAngle, endAngle) => {
        let angleDiff = endAngle - startAngle;
        if (angleDiff < 0) angleDiff += 2 * Math.PI;
        return radius * angleDiff;
    }
};

// ============ TESTS ============

describe('Point Validation', () => {
    it('should validate correct point objects', () => {
        const point = { x: 100, y: 200 };
        assert(DrawingValidators.isValidPoint(point));
    });

    it('should reject invalid point objects', () => {
        assert(!DrawingValidators.isValidPoint({ x: 100 }));
        assert(!DrawingValidators.isValidPoint({ x: 100, y: 'invalid' }));
        assert(!DrawingValidators.isValidPoint(null));
        assert(!DrawingValidators.isValidPoint(undefined));
    });
});

describe('Line Creation and Validation', () => {
    it('should create valid line', () => {
        MockShapes.clear();
        const line = MockShapes.createShape('line', {
            p1: { x: 0, y: 0 },
            p2: { x: 100, y: 100 }
        });
        assert(DrawingValidators.isValidLine(line));
    });

    it('should calculate line length correctly', () => {
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 3, y: 4 };
        const length = DrawingValidators.calculateLineLength(p1, p2);
        assert.strictEqual(length, 5);
    });

    it('should store line in shapes array', () => {
        MockShapes.clear();
        const line = MockShapes.createShape('line', {
            p1: { x: 0, y: 0 },
            p2: { x: 100, y: 100 }
        });
        assert.strictEqual(MockShapes.shapes.length, 1);
        assert.strictEqual(MockShapes.getShape(line.id).type, 'line');
    });
});

describe('Circle Creation and Validation', () => {
    it('should create valid circle', () => {
        MockShapes.clear();
        const circle = MockShapes.createShape('circle', {
            center: { x: 100, y: 100 },
            radius: 50
        });
        assert(DrawingValidators.isValidCircle(circle));
    });

    it('should reject circle with negative radius', () => {
        const invalidCircle = {
            type: 'circle',
            center: { x: 100, y: 100 },
            radius: -50
        };
        assert(!DrawingValidators.isValidCircle(invalidCircle));
    });

    it('should reject circle with zero radius', () => {
        const invalidCircle = {
            type: 'circle',
            center: { x: 100, y: 100 },
            radius: 0
        };
        assert(!DrawingValidators.isValidCircle(invalidCircle));
    });
});

describe('Arc Creation and Validation', () => {
    it('should create valid arc', () => {
        MockShapes.clear();
        const arc = MockShapes.createShape('arc', {
            center: { x: 100, y: 100 },
            radius: 50,
            startAngle: 0,
            endAngle: Math.PI / 2
        });
        assert(DrawingValidators.isValidArc(arc));
    });

    it('should calculate arc length correctly', () => {
        const radius = 50;
        const startAngle = 0;
        const endAngle = Math.PI / 2;

        const arcLength = DrawingValidators.calculateArcLength(radius, startAngle, endAngle);
        const expectedLength = 50 * (Math.PI / 2);

        assert(Math.abs(arcLength - expectedLength) < 0.01);
    });
});

describe('Shape Management', () => {
    it('should add multiple shapes', () => {
        MockShapes.clear();
        MockShapes.createShape('line', { p1: {x:0,y:0}, p2: {x:10,y:10} });
        MockShapes.createShape('circle', { center: {x:50,y:50}, radius: 20 });
        MockShapes.createShape('arc', { center: {x:100,y:100}, radius: 30, startAngle: 0, endAngle: 1 });

        assert.strictEqual(MockShapes.shapes.length, 3);
    });

    it('should delete shape by id', () => {
        MockShapes.clear();
        const line = MockShapes.createShape('line', { p1: {x:0,y:0}, p2: {x:10,y:10} });
        const circle = MockShapes.createShape('circle', { center: {x:50,y:50}, radius: 20 });

        assert.strictEqual(MockShapes.shapes.length, 2);

        MockShapes.deleteShape(line.id);

        assert.strictEqual(MockShapes.shapes.length, 1);
        assert(MockShapes.getShape(circle.id) !== undefined);
    });

    it('should clear all shapes', () => {
        MockShapes.clear();
        MockShapes.createShape('line', { p1: {x:0,y:0}, p2: {x:10,y:10} });
        MockShapes.createShape('circle', { center: {x:50,y:50}, radius: 20 });

        assert(MockShapes.shapes.length > 0);

        MockShapes.clear();

        assert.strictEqual(MockShapes.shapes.length, 0);
    });
});

// Export for use
module.exports = { DrawingValidators, MockShapes };
