# 👑 PRINCE2 Quiz Master 👑

## 🌟 Overview 🌟
Supercharge your PRINCE2 certification journey with our dynamic quiz application! Designed to be your ultimate study companion, this app provides a comprehensive suite of quizzes and specialized tests to ensure you're more than ready for the final exam.

## ✨ Features ✨
*   📚 **16 Weekly Quizzes:** Master the PRINCE2 syllabus week by week with targeted quizzes covering all 16 weeks of material.
*   🏆 **Final Exam:** Challenge yourself with a comprehensive final test, pulling 60 random questions from all topics.
*   🧠 **Failed Questions Review:** Turn weaknesses into strengths! Tackle a personalized test made up of questions you've previously missed, with automatic tracking of failed attempts.
*   ⏱️ **Smart Timer:** Each quiz comes with an intelligent timer that provides visual warnings as time runs low, helping you practice time management.
*   ⚡️ **Performance Optimized:** Enjoy a blazing-fast and seamless experience, thanks to on-demand data loading and an LRU cache implementation.
*   📊 **Detailed Results Analysis:** Get comprehensive feedback on your performance with detailed explanations for each question, helping you understand both correct and incorrect answers.
*   🔗 **Direct Access:** Use URL parameters to directly access specific quizzes, making it easy to bookmark or share quizzes.

## 🚀 How to Run 🚀
1.  Clone this repository to your local machine.
2.  Open the [`index.html`](./index.html) file in your favorite web browser.
3.  Start quizzing!

## 🔧 Architecture 🔧
The application is engineered for performance and efficiency.

Quiz data is neatly organized into individual JSON files within the [`data/json/`](./data/json/) directory. The navigation menu is dynamically generated using the [`data/manifest.json`](./data/manifest.json) file.

When you select a quiz, the app instantly fetches the required JSON data using the `fetch` API. This "just-in-time" data loading strategy guarantees a swift initial load and minimizes memory usage, as data is only loaded when you need it. An LRU (Least Recently Used) cache with time-based expiration further optimizes performance by caching frequently accessed data.
