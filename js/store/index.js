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
    Object.assign(state, newState);
    listeners.forEach(listener => listener());
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