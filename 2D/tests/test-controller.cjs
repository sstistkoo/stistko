/**
 * Unit Tests for Controller Functions
 * Tests G-code parsing, polar coordinates, last point detection
 */

const assert = require('assert');

// Mock globals for testing
global.window = {
    shapes: [],
    points: [],
    controllerMode: 'G90',
    xMeasureMode: 'radius',
    displayDecimals: 2
};

// ===== MOCK IMPLEMENTATIONS =====

// getLastPoint implementation (from controller.js)
const getLastPoint = function() {
    let lastPoint = null;

    if (window.shapes && window.shapes.length > 0) {
        for (let i = window.shapes.length - 1; i >= 0 && !lastPoint; i--) {
            const shape = window.shapes[i];
            if (shape.type === "point") {
                lastPoint = { x: shape.x, y: shape.y };
            } else if (shape.type === "line") {
                lastPoint = { x: shape.x2, y: shape.y2 };
            } else if (shape.type === "circle") {
                lastPoint = { x: shape.cx, y: shape.cy };
            } else if (shape.type === "arc") {
                const endAngle = shape.endAngle || shape.angle2 || 0;
                lastPoint = {
                    x: shape.cx + shape.r * Math.cos(endAngle),
                    y: shape.cy + shape.r * Math.sin(endAngle)
                };
            }
        }
    }

    if (!lastPoint && window.points && window.points.length > 0) {
        const p = window.points[window.points.length - 1];
        lastPoint = { x: p.x, y: p.y };
    }

    return lastPoint;
};

// parseGCode implementation (simplified from controller.js)
const parseGCode = function(input, mode = 'G90') {
    const cmd = input.toUpperCase().trim();

    // Detect G-code
    const gMatch = cmd.match(/G(\d+)/);
    let gCode = gMatch ? parseInt(gMatch[1]) : null;

    // Parse coordinates X, Z
    const xMatch = cmd.match(/X(-?\d+\.?\d*)/);
    const zMatch = cmd.match(/Z(-?\d+\.?\d*)/);

    // Parse polar coordinates
    const lMatch = cmd.match(/L(-?\d+\.?\d*)/);
    const rpMatch = cmd.match(/RP(-?\d+\.?\d*)/);
    const apMatch = cmd.match(/AP(-?\d+\.?\d*)/);
    const aMatch = cmd.match(/(?<![R])A(?!P)(-?\d+\.?\d*)/);

    // Parse radius
    const rMatch = cmd.match(/(?<!C|A|R)R(-?\d+\.?\d*)/);

    // Detect implicit G1 if no G-code and has coordinates
    // Note: gCode === null means no G-code was found (not G0)
    if (gCode === null && (xMatch || zMatch || lMatch || rpMatch || apMatch || aMatch)) {
        gCode = 1;
    }

    const result = {
        gCode,
        x: xMatch ? parseFloat(xMatch[1]) : null,
        z: zMatch ? parseFloat(zMatch[1]) : null,
        l: lMatch ? parseFloat(lMatch[1]) : null,
        rp: rpMatch ? parseFloat(rpMatch[1]) : null,
        ap: apMatch ? parseFloat(apMatch[1]) : null,
        a: aMatch ? parseFloat(aMatch[1]) : null,
        r: rMatch ? parseFloat(rMatch[1]) : null,
        mode
    };

    return result;
};

// Calculate polar endpoint
const calculatePolarEndpoint = function(startX, startY, length, angleDeg) {
    const angleRad = angleDeg * Math.PI / 180;
    return {
        x: startX + length * Math.cos(angleRad),
        y: startY + length * Math.sin(angleRad)
    };
};

// findNearestSnapPoint implementation (simplified)
const findNearestSnapPoint = function(candidates, targetX, targetY, threshold = 20) {
    let nearest = null;
    let minDist = threshold;

    for (const c of candidates) {
        const dist = Math.sqrt((c.x - targetX) ** 2 + (c.y - targetY) ** 2);
        if (dist < minDist) {
            minDist = dist;
            nearest = c;
        }
    }

    return nearest;
};

// ============ TESTS ============

describe('G-Code Parsing - Basic', () => {
    it('should parse G0 with X and Z', () => {
        const result = parseGCode('G0 X50 Z100');
        // G0 se parsuje jako číslo 0
        assert.strictEqual(result.gCode, 0);
        assert.strictEqual(result.x, 50);
        assert.strictEqual(result.z, 100);
    });

    it('should parse G1 with X and Z', () => {
        const result = parseGCode('G1 X100 Z200');
        assert.strictEqual(result.gCode, 1);
        assert.strictEqual(result.x, 100);
        assert.strictEqual(result.z, 200);
    });

    it('should parse G2 arc with radius', () => {
        const result = parseGCode('G2 X100 Z150 R25');
        assert.strictEqual(result.gCode, 2);
        assert.strictEqual(result.x, 100);
        assert.strictEqual(result.z, 150);
        assert.strictEqual(result.r, 25);
    });

    it('should parse G3 arc', () => {
        const result = parseGCode('G3 X50 Z80 R15');
        assert.strictEqual(result.gCode, 3);
        assert.strictEqual(result.r, 15);
    });

    it('should detect implicit G1 for X Z coordinates', () => {
        const result = parseGCode('X80 Z120');
        assert.strictEqual(result.gCode, 1);
        assert.strictEqual(result.x, 80);
        assert.strictEqual(result.z, 120);
    });
});

describe('G-Code Parsing - Polar Coordinates', () => {
    it('should parse L and AP (length and polar angle)', () => {
        const result = parseGCode('L50 AP0');
        assert.strictEqual(result.gCode, 1);
        assert.strictEqual(result.l, 50);
        assert.strictEqual(result.ap, 0);
    });

    it('should parse L and AP with different angles', () => {
        const result = parseGCode('L30 AP90');
        assert.strictEqual(result.l, 30);
        assert.strictEqual(result.ap, 90);
    });

    it('should parse RP and AP (polar radius and angle)', () => {
        const result = parseGCode('RP120 AP45');
        assert.strictEqual(result.rp, 120);
        assert.strictEqual(result.ap, 45);
    });

    it('should parse L and A (alternative angle syntax)', () => {
        const result = parseGCode('L50 A90');
        assert.strictEqual(result.l, 50);
        assert.strictEqual(result.a, 90);
    });

    it('should not confuse A with AP', () => {
        const result = parseGCode('AP45');
        assert.strictEqual(result.ap, 45);
        assert.strictEqual(result.a, null);
    });

    it('should handle negative angles', () => {
        const result = parseGCode('L50 AP-45');
        assert.strictEqual(result.ap, -45);
    });
});

describe('G-Code Parsing - Edge Cases', () => {
    it('should handle decimal values', () => {
        const result = parseGCode('X50.5 Z100.75');
        assert.strictEqual(result.x, 50.5);
        assert.strictEqual(result.z, 100.75);
    });

    it('should handle negative coordinates', () => {
        const result = parseGCode('G1 X-50 Z-100');
        assert.strictEqual(result.x, -50);
        assert.strictEqual(result.z, -100);
    });

    it('should handle lowercase input', () => {
        const result = parseGCode('g1 x50 z100');
        assert.strictEqual(result.gCode, 1);
        assert.strictEqual(result.x, 50);
        assert.strictEqual(result.z, 100);
    });

    it('should handle extra spaces', () => {
        const result = parseGCode('  G1   X50   Z100  ');
        assert.strictEqual(result.gCode, 1);
        assert.strictEqual(result.x, 50);
    });
});

describe('Polar Endpoint Calculation', () => {
    it('should calculate endpoint at 0 degrees (right)', () => {
        const result = calculatePolarEndpoint(0, 0, 50, 0);
        assert(Math.abs(result.x - 50) < 0.001);
        assert(Math.abs(result.y - 0) < 0.001);
    });

    it('should calculate endpoint at 90 degrees (up)', () => {
        const result = calculatePolarEndpoint(0, 0, 30, 90);
        assert(Math.abs(result.x - 0) < 0.001);
        assert(Math.abs(result.y - 30) < 0.001);
    });

    it('should calculate endpoint at 180 degrees (left)', () => {
        const result = calculatePolarEndpoint(0, 0, 40, 180);
        assert(Math.abs(result.x - (-40)) < 0.001);
        assert(Math.abs(result.y - 0) < 0.001);
    });

    it('should calculate endpoint at 270 degrees (down)', () => {
        const result = calculatePolarEndpoint(0, 0, 25, 270);
        assert(Math.abs(result.x - 0) < 0.001);
        assert(Math.abs(result.y - (-25)) < 0.001);
    });

    it('should calculate endpoint at 45 degrees (diagonal)', () => {
        const result = calculatePolarEndpoint(0, 0, Math.sqrt(2) * 50, 45);
        assert(Math.abs(result.x - 50) < 0.001);
        assert(Math.abs(result.y - 50) < 0.001);
    });

    it('should calculate from non-zero start point', () => {
        const result = calculatePolarEndpoint(100, 100, 50, 0);
        assert(Math.abs(result.x - 150) < 0.001);
        assert(Math.abs(result.y - 100) < 0.001);
    });
});

describe('Last Point Detection', () => {
    beforeEach(() => {
        window.shapes = [];
        window.points = [];
    });

    it('should return null for empty shapes', () => {
        const result = getLastPoint();
        assert.strictEqual(result, null);
    });

    it('should get last point from point shape', () => {
        window.shapes = [
            { type: 'point', x: 10, y: 20 }
        ];
        const result = getLastPoint();
        assert.deepStrictEqual(result, { x: 10, y: 20 });
    });

    it('should get endpoint from line shape', () => {
        window.shapes = [
            { type: 'line', x1: 0, y1: 0, x2: 100, y2: 50 }
        ];
        const result = getLastPoint();
        assert.deepStrictEqual(result, { x: 100, y: 50 });
    });

    it('should get center from circle shape', () => {
        window.shapes = [
            { type: 'circle', cx: 75, cy: 80, r: 25 }
        ];
        const result = getLastPoint();
        assert.deepStrictEqual(result, { x: 75, y: 80 });
    });

    it('should get last point from multiple shapes (uses last)', () => {
        window.shapes = [
            { type: 'point', x: 10, y: 20 },
            { type: 'line', x1: 10, y1: 20, x2: 50, y2: 60 },
            { type: 'point', x: 80, y: 90 }
        ];
        const result = getLastPoint();
        assert.deepStrictEqual(result, { x: 80, y: 90 });
    });

    it('should fallback to points array if no shapes', () => {
        window.shapes = [];
        window.points = [
            { x: 5, y: 10 },
            { x: 15, y: 25 }
        ];
        const result = getLastPoint();
        assert.deepStrictEqual(result, { x: 15, y: 25 });
    });
});

describe('Snap Point Finding', () => {
    it('should find nearest point within threshold', () => {
        const candidates = [
            { x: 0, y: 0, type: 'point' },
            { x: 100, y: 100, type: 'point' },
            { x: 50, y: 50, type: 'point' }
        ];
        const result = findNearestSnapPoint(candidates, 52, 48, 20);
        assert.deepStrictEqual(result, { x: 50, y: 50, type: 'point' });
    });

    it('should return null if no point within threshold', () => {
        const candidates = [
            { x: 0, y: 0, type: 'point' },
            { x: 100, y: 100, type: 'point' }
        ];
        const result = findNearestSnapPoint(candidates, 50, 50, 10);
        assert.strictEqual(result, null);
    });

    it('should find closest when multiple are within threshold', () => {
        const candidates = [
            { x: 45, y: 45, type: 'point', label: 'A' },
            { x: 51, y: 49, type: 'point', label: 'B' },
            { x: 55, y: 55, type: 'point', label: 'C' }
        ];
        const result = findNearestSnapPoint(candidates, 50, 50, 20);
        assert.strictEqual(result.label, 'B');
    });

    it('should work with empty candidates array', () => {
        const result = findNearestSnapPoint([], 50, 50, 20);
        assert.strictEqual(result, null);
    });
});

describe('G90 vs G91 Mode', () => {
    it('should parse command with G90 mode', () => {
        const result = parseGCode('X100 Z200', 'G90');
        assert.strictEqual(result.mode, 'G90');
    });

    it('should parse command with G91 mode', () => {
        const result = parseGCode('X50 Z50', 'G91');
        assert.strictEqual(result.mode, 'G91');
    });

    it('should parse explicit G90 command', () => {
        const result = parseGCode('G90 X100');
        assert.strictEqual(result.gCode, 90);
        assert.strictEqual(result.x, 100);
    });

    it('should parse explicit G91 command', () => {
        const result = parseGCode('G91 X50');
        assert.strictEqual(result.gCode, 91);
        assert.strictEqual(result.x, 50);
    });
});
