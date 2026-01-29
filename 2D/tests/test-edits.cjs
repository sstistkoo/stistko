/**
 * Unit Tests for Edit Operations
 * Tests trim, extend, offset, mirror, erase
 */

const assert = require('assert');

// Edit operations mock
const MockEditOps = {
    // Line trim - find intersection point on line
    trimLine: function(line, cutPoint) {
        if (!line || !line.p1 || !line.p2) return null;
        if (!cutPoint || cutPoint.x === undefined || cutPoint.y === undefined) return null;

        // Check if point is on line segment
        const tolerance = 0.1;
        const d1 = Math.sqrt((line.p1.x - cutPoint.x) ** 2 + (line.p1.y - cutPoint.y) ** 2);
        const d2 = Math.sqrt((line.p2.x - cutPoint.x) ** 2 + (line.p2.y - cutPoint.y) ** 2);
        const lineLen = Math.sqrt((line.p2.x - line.p1.x) ** 2 + (line.p2.y - line.p1.y) ** 2);

        if (Math.abs(d1 + d2 - lineLen) < tolerance) {
            return { p1: line.p1, p2: cutPoint };
        }
        return null;
    },

    // Parallel - create offset line
    parallel: function(line, distance) {
        if (!line || !line.p1 || !line.p2) return null;

        const dx = line.p2.x - line.p1.x;
        const dy = line.p2.y - line.p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) return null;

        const perpX = -dy / len * distance;
        const perpY = dx / len * distance;

        return {
            p1: { x: line.p1.x + perpX, y: line.p1.y + perpY },
            p2: { x: line.p2.x + perpX, y: line.p2.y + perpY }
        };
    },

    // Mirror point across line
    getMirrorPoint: function(point, line) {
        if (!point || !line || !line.p1 || !line.p2) return null;

        const x0 = point.x, y0 = point.y;
        const x1 = line.p1.x, y1 = line.p1.y;
        const x2 = line.p2.x, y2 = line.p2.y;

        const A = y2 - y1;
        const B = x1 - x2;
        const C = A * x1 + B * y1;

        const denom = A * A + B * B;
        if (Math.abs(denom) < 0.001) return null;

        const x = (B * (B * x0 - A * y0) - A * C) / denom;
        const y = (A * (-B * x0 + A * y0) - B * C) / denom;

        return { x: 2 * x - x0, y: 2 * y - y0 };
    },

    // Erase shape
    eraseShape: function(shapes, shapeId) {
        return shapes.filter(s => s.id !== shapeId);
    }
};

// ============ TESTS ============

describe('Trim Operation', () => {
    it('should trim line at cut point', () => {
        const line = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } };
        const cutPoint = { x: 50, y: 0 };

        const result = MockEditOps.trimLine(line, cutPoint);

        assert(result !== null);
        assert.deepStrictEqual(result.p1, { x: 0, y: 0 });
        assert.deepStrictEqual(result.p2, { x: 50, y: 0 });
    });

    it('should return null for point not on line', () => {
        const line = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } };
        const cutPoint = { x: 50, y: 50 };

        const result = MockEditOps.trimLine(line, cutPoint);
        assert.strictEqual(result, null);
    });

    it('should return null for invalid input', () => {
        assert.strictEqual(MockEditOps.trimLine(null, {}), null);
        assert.strictEqual(MockEditOps.trimLine({}, null), null);
    });
});

describe('Parallel Operation', () => {
    it('should create parallel line', () => {
        const line = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } };
        const distance = 50;

        const result = MockEditOps.parallel(line, distance);

        assert(result !== null);
        assert.strictEqual(result.p1.y, 50);
        assert.strictEqual(result.p2.y, 50);
        assert.strictEqual(result.p1.x, 0);
        assert.strictEqual(result.p2.x, 100);
    });

    it('should handle negative distance', () => {
        const line = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } };
        const result = MockEditOps.parallel(line, -30);

        assert(result !== null);
        assert.strictEqual(result.p1.y, -30);
    });

    it('should return null for zero-length line', () => {
        const line = { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } };
        const result = MockEditOps.parallel(line, 50);

        assert.strictEqual(result, null);
    });
});

describe('Mirror Operation', () => {
    it('should mirror point across horizontal line', () => {
        const point = { x: 10, y: 20 };
        const line = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } };

        const result = MockEditOps.getMirrorPoint(point, line);

        assert(result !== null);
        assert.strictEqual(Math.round(result.x), 10);
        assert.strictEqual(Math.round(result.y), -20);
    });

    it('should mirror point across vertical line', () => {
        const point = { x: 20, y: 10 };
        const line = { p1: { x: 0, y: 0 }, p2: { x: 0, y: 100 } };

        const result = MockEditOps.getMirrorPoint(point, line);

        assert(result !== null);
        assert.strictEqual(Math.round(result.x), -20);
        assert.strictEqual(Math.round(result.y), 10);
    });

    it('should mirror point across diagonal line', () => {
        const point = { x: 10, y: 0 };
        const line = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 100 } };

        const result = MockEditOps.getMirrorPoint(point, line);

        assert(result !== null);
        assert.strictEqual(Math.round(result.x), 0);
        assert.strictEqual(Math.round(result.y), 10);
    });

    it('should return null for invalid input', () => {
        assert.strictEqual(MockEditOps.getMirrorPoint(null, {}), null);
        assert.strictEqual(MockEditOps.getMirrorPoint({}, null), null);
    });
});

describe('Erase Operation', () => {
    it('should erase shape by id', () => {
        const shapes = [
            { id: 1, type: 'line' },
            { id: 2, type: 'circle' },
            { id: 3, type: 'arc' }
        ];

        const result = MockEditOps.eraseShape(shapes, 2);

        assert.strictEqual(result.length, 2);
        assert(!result.find(s => s.id === 2));
    });

    it('should handle non-existent id', () => {
        const shapes = [
            { id: 1, type: 'line' },
            { id: 2, type: 'circle' }
        ];

        const result = MockEditOps.eraseShape(shapes, 999);

        assert.strictEqual(result.length, 2);
    });

    it('should work on empty array', () => {
        const result = MockEditOps.eraseShape([], 1);
        assert.strictEqual(result.length, 0);
    });
});

// Export for use
module.exports = { MockEditOps };
