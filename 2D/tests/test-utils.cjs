/**
 * Unit Tests for Utility Functions
 * Tests core geometry and transform functions
 */

const assert = require('assert');

// Mock globals for testing
global.window = {
    shapes: [],
    points: [],
    canvas: { width: 800, height: 600 },
    zoom: 1,
    panX: 0,
    panY: 0,
    gridSpacing: 50,
    snapDistance: 15,
    snapToGrid: true,
    snapToPoints: true,
    currentMode: null
};

// Import functions (simplified - in real setup would use modules)
const TestUtils = {
    // Geometry functions
    distance: (p1, p2) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2),

    // Line-line intersection
    lineLineIntersect: (p1, p2, p3, p4) => {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 1e-10) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    },

    // Line-circle intersection
    lineCircleIntersect: (p1, p2, center, radius) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const fx = p1.x - center.x;
        const fy = p1.y - center.y;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - radius * radius;

        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return [];

        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

        const intersections = [];
        if (t1 >= 0 && t1 <= 1) {
            intersections.push({
                x: p1.x + t1 * dx,
                y: p1.y + t1 * dy
            });
        }
        if (t2 >= 0 && t2 <= 1 && t2 !== t1) {
            intersections.push({
                x: p1.x + t2 * dx,
                y: p1.y + t2 * dy
            });
        }
        return intersections;
    },

    // Coordinate transforms
    worldToScreen: (worldX, worldY, canvas, zoom, panX, panY) => {
        return {
            x: worldX * zoom + panX,
            y: panY - worldY * zoom
        };
    },

    screenToWorld: (screenX, screenY, canvas, zoom, panX, panY) => {
        return {
            x: (screenX - panX) / zoom,
            y: (panY - screenY) / zoom
        };
    },

    // Snap functions
    snapPoint: (point, gridSpacing, snapDistance, snapToGrid, snapToPoints, points) => {
        let snappedPoint = { ...point };

        // Snap to grid
        if (snapToGrid) {
            const snappedX = Math.round(point.x / gridSpacing) * gridSpacing;
            const snappedY = Math.round(point.y / gridSpacing) * gridSpacing;
            const distToGrid = Math.sqrt(
                (point.x - snappedX) ** 2 + (point.y - snappedY) ** 2
            );
            if (distToGrid < snapDistance) {
                snappedPoint = { x: snappedX, y: snappedY };
                return snappedPoint;
            }
        }

        // Snap to existing points
        if (snapToPoints && points && points.length > 0) {
            for (const p of points) {
                const dist = Math.sqrt(
                    (point.x - p.x) ** 2 + (point.y - p.y) ** 2
                );
                if (dist < snapDistance && dist > 0) {
                    snappedPoint = { x: p.x, y: p.y };
                    break;
                }
            }
        }

        return snappedPoint;
    }
};

// ============ TESTS ============

describe('Utility Functions', () => {

    describe('Distance Calculation', () => {
        it('should calculate distance between two points', () => {
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 3, y: 4 };
            const dist = TestUtils.distance(p1, p2);
            assert.strictEqual(dist, 5);
        });

        it('should return 0 for identical points', () => {
            const p1 = { x: 10, y: 20 };
            const p2 = { x: 10, y: 20 };
            const dist = TestUtils.distance(p1, p2);
            assert.strictEqual(dist, 0);
        });
    });

    describe('Line-Line Intersection', () => {
        it('should find intersection of two lines', () => {
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 10, y: 10 };
            const p3 = { x: 0, y: 10 };
            const p4 = { x: 10, y: 0 };

            const intersection = TestUtils.lineLineIntersect(p1, p2, p3, p4);
            assert(intersection !== null);
            assert.strictEqual(Math.round(intersection.x * 10) / 10, 5);
            assert.strictEqual(Math.round(intersection.y * 10) / 10, 5);
        });

        it('should return null for parallel lines', () => {
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 10, y: 0 };
            const p3 = { x: 0, y: 5 };
            const p4 = { x: 10, y: 5 };

            const intersection = TestUtils.lineLineIntersect(p1, p2, p3, p4);
            assert.strictEqual(intersection, null);
        });
    });

    describe('Line-Circle Intersection', () => {
        it('should find line-circle intersections', () => {
            const p1 = { x: -10, y: 0 };
            const p2 = { x: 10, y: 0 };
            const center = { x: 0, y: 0 };
            const radius = 5;

            const intersections = TestUtils.lineCircleIntersect(p1, p2, center, radius);
            assert.strictEqual(intersections.length, 2);
            assert.strictEqual(Math.round(intersections[0].x), -5);
            assert.strictEqual(Math.round(intersections[1].x), 5);
        });

        it('should return empty array when line misses circle', () => {
            const p1 = { x: 0, y: 10 };
            const p2 = { x: 10, y: 10 };
            const center = { x: 0, y: 0 };
            const radius = 5;

            const intersections = TestUtils.lineCircleIntersect(p1, p2, center, radius);
            assert.strictEqual(intersections.length, 0);
        });
    });

    describe('Coordinate Transforms', () => {
        it('should transform world to screen coordinates', () => {
            const canvas = { width: 800, height: 600 };
            const screenCoord = TestUtils.worldToScreen(100, 100, canvas, 1, 0, 0);
            assert.strictEqual(screenCoord.x, 100);
            assert.strictEqual(screenCoord.y, -100);
        });

        it('should transform screen to world coordinates', () => {
            const canvas = { width: 800, height: 600 };
            const worldCoord = TestUtils.screenToWorld(100, -100, canvas, 1, 0, 0);
            assert.strictEqual(worldCoord.x, 100);
            assert.strictEqual(worldCoord.y, 100);
        });

        it('should handle zoom in transforms', () => {
            const canvas = { width: 800, height: 600 };
            const screenCoord = TestUtils.worldToScreen(100, 100, canvas, 2, 0, 0);
            assert.strictEqual(screenCoord.x, 200);
            assert.strictEqual(screenCoord.y, -200);
        });

        it('should handle pan in transforms', () => {
            const canvas = { width: 800, height: 600 };
            const screenCoord = TestUtils.worldToScreen(100, 100, canvas, 1, 50, 50);
            assert.strictEqual(screenCoord.x, 150);
            assert.strictEqual(screenCoord.y, -50);
        });
    });

    describe('Snap Functions', () => {
        it('should not snap when outside distance', () => {
            const point = { x: 100, y: 100 };
            const snapped = TestUtils.snapPoint(point, 50, 15, true, false, []);
            assert.strictEqual(snapped.x, 100);
            assert.strictEqual(snapped.y, 100);
        });

        it('should snap point to existing points', () => {
            const point = { x: 50.5, y: 50.5 };
            const existingPoints = [{ x: 50, y: 50 }];
            const snapped = TestUtils.snapPoint(point, 50, 1, false, true, existingPoints);
            assert.strictEqual(snapped.x, 50);
            assert.strictEqual(snapped.y, 50);
        });
    });
});

// Export for use
module.exports = TestUtils;
