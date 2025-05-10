// Simple global state management for the mini-framework
let state = {};
let listeners = [];

export function createState(initialState) {
    state = { ...initialState };
}

export function getState() {
    return { ...state };
}

export function setState(newState) {
    state = { ...state, ...newState };
    listeners.forEach(fn => fn(getState()));
}

export function subscribe(fn) {
    listeners.push(fn);
    return () => {
        listeners = listeners.filter(l => l !== fn);
    };
}
