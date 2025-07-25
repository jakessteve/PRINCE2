# PRINCE2 Quiz App

## Overview
A web-based quiz application designed to help users study for PRINCE2 certification by providing weekly quizzes and specialized tests.

## Features
*   **Weekly Quizzes:** Take quizzes for each week of the PRINCE2 syllabus.
*   **Final Test:** A comprehensive final test with 60 random questions from all weeks.
*   **Failed Questions Test:** A special test composed of questions you have previously answered incorrectly.
*   **Performance Optimized:** Features on-demand data loading for a faster, more efficient user experience.

## How to Run
1.  Clone the repository.
2.  Open the [`index.html`](./index.html) file in your web browser.

## Architecture
The application's data loading mechanism was recently refactored for improved performance.

Quiz data is stored in individual JSON files located in the [`data/json/`](./data/json/) directory. A [`data/manifest.json`](./data/manifest.json) file is used to dynamically build the quiz navigation menu.

When a user selects a quiz, the application asynchronously fetches the corresponding JSON data using the `fetch` API. This on-demand approach improves the initial load time and reduces memory usage, as data is only loaded when it's needed.
