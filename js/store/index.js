const state = {
    quizData: [],
    shuffledData: [],
    timerInterval: null,
    startTime: null,
    initialTotalTime: 0,
    isTestActive: false,
    isTestFinished: false,
};

const listeners = [];

export function getState() {
    return { ...state };
}

export function setState(newState) {
    // Only update state and notify listeners if something actually changed
    let hasChanged = false;
    for (const key in newState) {
        if (state[key] !== newState[key]) {
            state[key] = newState[key];
            hasChanged = true;
        }
    }
    
    if (hasChanged) {
        listeners.forEach(listener => listener());
    }
}

export function subscribe(listener) {
    listeners.push(listener);
    return function unsubscribe() {
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    };
}