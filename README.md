# 👑 PRINCE2 Quiz Master 👑

## 🌟 Overview 🌟
Supercharge your PRINCE2 certification journey with our dynamic quiz application! Designed to be your ultimate study companion, this app provides a comprehensive suite of quizzes and specialized tests to ensure you're more than ready for the final exam.

## ✨ Features ✨
*   📚 **Weekly Quizzes:** Master the PRINCE2 syllabus week by week with targeted quizzes.
*   🏆 **Final Exam:** Challenge yourself with a comprehensive final test, pulling 60 random questions from all topics.
*   🧠 **Failed Questions Review:** Turn weaknesses into strengths! Tackle a personalized test made up of questions you've previously missed.
*   ⚡️ **Performance Optimized:** Enjoy a blazing-fast and seamless experience, thanks to on-demand data loading.

## 🚀 How to Run 🚀
1.  Clone this repository to your local machine.
2.  Open the [`index.html`](./index.html) file in your favorite web browser.
3.  Start quizzing!

## 🔧 Architecture 🔧
The application is engineered for performance and efficiency.

Quiz data is neatly organized into individual JSON files within the [`data/json/`](./data/json/) directory. The navigation menu is dynamically generated using the [`data/manifest.json`](./data/manifest.json) file.

When you select a quiz, the app instantly fetches the required JSON data using the `fetch` API. This "just-in-time" data loading strategy guarantees a swift initial load and minimizes memory usage, as data is only loaded when you need it.
