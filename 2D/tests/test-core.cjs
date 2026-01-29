/**
 * Unit Tests for Core Features
 * Tests state management, undo/redo, modes
 */

const assert = require('assert');

// State management mock
const MockState = {
    history: [],
    future: [],
    currentState: {},

    saveState: function(state) {
        this.history.push({ ...this.currentState });
        this.currentState = { ...state };
        this.future = [];
    },

    undo: function() {
        if (this.history.length === 0) return false;
        this.future.unshift({ ...this.currentState });
        this.currentState = { ...this.history.pop() };
        return true;
    },

    redo: function() {
        if (this.future.length === 0) return false;
        this.history.push({ ...this.currentState });
        this.currentState = { ...this.future.shift() };
        return true;
    },

    canUndo: function() {
        return this.history.length > 0;
    },

    canRedo: function() {
        return this.future.length > 0;
    },

    reset: function() {
        this.history = [];
        this.future = [];
        this.currentState = {};
    }
};

// Mode manager mock
const MockModeManager = {
    modes: {
        'line': { name: 'Line', icon: '📏' },
        'circle': { name: 'Circle', icon: '⭕' },
        'arc': { name: 'Arc', icon: '🌙' },
        'select': { name: 'Select', icon: '👆' },
        'rotate': { name: 'Rotate', icon: '🔄' }
    },

    currentMode: null,
    previousMode: null,

    setMode: function(modeName) {
        if (!this.modes[modeName]) {
            throw new Error(`Unknown mode: ${modeName}`);
        }
        this.previousMode = this.currentMode;
        this.currentMode = modeName;
        return true;
    },

    getMode: function() {
        return this.currentMode;
    },

    getPreviousMode: function() {
        return this.previousMode;
    },

    modeExists: function(modeName) {
        return this.modes.hasOwnProperty(modeName);
    },

    clearMode: function() {
        this.previousMode = this.currentMode;
        this.currentMode = null;
    },

    reset: function() {
        this.currentMode = null;
        this.previousMode = null;
    }
};

// Constraint manager mock
const MockConstraintManager = {
    constraints: [],
    nextId: 1000,

    addConstraint: function(type, data) {
        if (!['coincident', 'parallel', 'perpendicular', 'equal', 'distance', 'angle'].includes(type)) {
            throw new Error(`Unknown constraint type: ${type}`);
        }
        const constraint = { type, data, id: this.nextId++ };
        this.constraints.push(constraint);
        return constraint;
    },

    removeConstraint: function(id) {
        const before = this.constraints.length;
        this.constraints = this.constraints.filter(c => c.id !== id);
        return before > this.constraints.length;
    },

    getConstraints: function() {
        return [...this.constraints];
    },

    getConstraintsByType: function(type) {
        return this.constraints.filter(c => c.type === type);
    },

    clear: function() {
        this.constraints = [];
        this.nextId = 1000;
    }
};

// ============ TESTS ============

describe('Undo/Redo System', () => {
    it('should save state', () => {
        MockState.reset();
        MockState.saveState({ x: 100, y: 200 });
        assert.deepStrictEqual(MockState.currentState, { x: 100, y: 200 });
    });

    it('should undo to previous state', () => {
        MockState.reset();
        MockState.saveState({ x: 100, y: 200 });
        MockState.saveState({ x: 300, y: 400 });

        assert(MockState.canUndo());
        MockState.undo();
        assert.deepStrictEqual(MockState.currentState, { x: 100, y: 200 });
    });

    it('should redo to next state', () => {
        MockState.reset();
        MockState.saveState({ x: 100, y: 200 });
        MockState.saveState({ x: 300, y: 400 });
        MockState.undo();

        assert(MockState.canRedo());
        MockState.redo();
        assert.deepStrictEqual(MockState.currentState, { x: 300, y: 400 });
    });

    it('should clear future on new save', () => {
        MockState.reset();
        MockState.saveState({ x: 100 });
        MockState.saveState({ x: 200 });
        MockState.undo();

        assert(MockState.canRedo());
        MockState.saveState({ x: 150 });
        assert(!MockState.canRedo());
    });

    it('should not undo when no history', () => {
        MockState.reset();
        assert(!MockState.canUndo());
        assert(!MockState.undo());
    });

    it('should not redo when no future', () => {
        MockState.reset();
        MockState.saveState({ x: 100 });
        assert(!MockState.canRedo());
        assert(!MockState.redo());
    });
});

describe('Mode Management', () => {
    beforeEach = () => MockModeManager.reset();

    it('should set mode', () => {
        MockModeManager.reset();
        MockModeManager.setMode('line');
        assert.strictEqual(MockModeManager.getMode(), 'line');
    });

    it('should track previous mode', () => {
        MockModeManager.reset();
        MockModeManager.setMode('line');
        MockModeManager.setMode('circle');

        assert.strictEqual(MockModeManager.getMode(), 'circle');
        assert.strictEqual(MockModeManager.getPreviousMode(), 'line');
    });

    it('should check if mode exists', () => {
        assert(MockModeManager.modeExists('line'));
        assert(MockModeManager.modeExists('rotate'));
        assert(!MockModeManager.modeExists('invalid'));
    });

    it('should throw on invalid mode', () => {
        MockModeManager.reset();
        assert.throws(() => {
            MockModeManager.setMode('invalidMode');
        }, Error);
    });

    it('should clear current mode', () => {
        MockModeManager.reset();
        MockModeManager.setMode('line');
        MockModeManager.clearMode();

        assert.strictEqual(MockModeManager.getMode(), null);
        assert.strictEqual(MockModeManager.getPreviousMode(), 'line');
    });
});

describe('Constraint System', () => {
    it('should add constraint', () => {
        MockConstraintManager.clear();
        const constraint = MockConstraintManager.addConstraint('coincident',
            { point1: 'p1', point2: 'p2' });

        assert.strictEqual(constraint.type, 'coincident');
        assert(constraint.id);
    });

    it('should reject invalid constraint type', () => {
        MockConstraintManager.clear();
        assert.throws(() => {
            MockConstraintManager.addConstraint('invalid', {});
        }, Error);
    });

    it('should get all constraints', () => {
        MockConstraintManager.clear();
        MockConstraintManager.addConstraint('coincident', {});
        MockConstraintManager.addConstraint('parallel', {});

        assert.strictEqual(MockConstraintManager.getConstraints().length, 2);
    });

    it('should get constraints by type', () => {
        MockConstraintManager.clear();
        MockConstraintManager.addConstraint('coincident', {});
        MockConstraintManager.addConstraint('parallel', {});
        MockConstraintManager.addConstraint('coincident', {});

        const coincidents = MockConstraintManager.getConstraintsByType('coincident');
        assert.strictEqual(coincidents.length, 2);
    });

    it('should remove constraint', () => {
        MockConstraintManager.clear();
        const c1 = MockConstraintManager.addConstraint('coincident', {});
        const c2 = MockConstraintManager.addConstraint('parallel', {});

        assert.strictEqual(MockConstraintManager.getConstraints().length, 2);

        const removed = MockConstraintManager.removeConstraint(c1.id);
        assert(removed === true);

        assert.strictEqual(MockConstraintManager.getConstraints().length, 1);
        assert.strictEqual(MockConstraintManager.getConstraints()[0].type, 'parallel');
    });

    it('should clear all constraints', () => {
        MockConstraintManager.clear();
        MockConstraintManager.addConstraint('coincident', {});
        MockConstraintManager.addConstraint('parallel', {});

        MockConstraintManager.clear();
        assert.strictEqual(MockConstraintManager.getConstraints().length, 0);
    });
});

// Export for use
module.exports = { MockState, MockModeManager, MockConstraintManager };
