# Contributing to Gemini Folders



First off, thanks for taking the time to contribute! 🎉



We welcome contributions to make **Gemini Folders** better. Whether it's fixing a bug, improving the documentation, or proposing a new feature, your help is appreciated.



## How to Contribute



The project follows the standard **GitHub Flow**. Here is a quick guide:



### 1. Fork the Repository

Click the **Fork** button at the top right of the repository page to create your own copy of the project.



### 2. Clone Your Fork

Clone the repository to your local machine:



```bash

git clone https://github.com/YOUR-USERNAME/gemini-folders.git

cd gemini-folders

```



### 3. Create a Branch

Always create a new branch for your changes. Avoid working directly on the main branch.



```bash

git checkout -b feature/my-new-feature

# or for bugs

git checkout -b fix/bug-description

```



### 4. Make Your Changes

* **Code Style:** Please keep the code clean. Use **English** for variable names and comments.

* **Comments:** Add concise comments explaining *why* you did something complex, not *what* the code does (the code should speak for itself).

* **Testing:**

    1. Open Chrome and go to `chrome://extensions`.

    2. Enable **Developer Mode**.

    3. Click **Load unpacked** and select your project folder.

    4. Test your changes on gemini.google.com.



### 5. Commit and Push

Commit your changes with a descriptive message:



```bash

git add .

git commit -m "Add feature: automatic folder sorting"

git push origin feature/my-new-feature

```



### 6. Submit a Pull Request

1. Go to the original repository on GitHub.

2. You should see a prompt to open a **Pull Request (PR)** from your new branch.

3. Fill in the title and description explaining what you changed and why.

4. Submit the PR!



---



## Guidelines



* **Respect the Code Structure:** Keep logic in `content.js` and styles in `styles.css`.

* **No "Fix" Comments:** Do not leave commented-out code or `// TODO` / `// FIX` comments in the final PR.

* **Manifest V3:** Ensure all changes comply with Chrome Manifest V3 requirements.



**Thank you for helping improve Gemini Folders!**

