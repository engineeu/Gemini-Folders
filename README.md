# Gemini Folders Extension

A Chrome extension to organize Google Gemini chats into custom folders. It improves productivity by allowing you to group conversations by topic or project.

The interface natively supports both **Light Mode** and **Dark Mode**, automatically adapting to the user's system preferences.

## Key Features

* 📂 **Folder Creation:** Organize your chats into logical folders.
* 💾 **Local Storage:** Data is saved locally for maximum performance and privacy (`chrome.storage.local`).
* 🔄 **Backup & Restore:** Import/Export functionality (JSON file) to easily transfer your folders between different computers.
* ⚡ **Smart Navigation:** Switch between chats without reloading the page (SPA friendly).
* 🌓 **Dark Mode Support:** Automatic theme detection for perfect readability.
* ✏️ **Full Management:** Rename and delete both folders and chat links.
* 🎨 **Native Look:** Visually integrates with the Gemini interface.

## Code Structure (`content.js`)

Here is a brief overview of the main functions implemented in the script:

### Data Management (Storage)
* `getFolders(callback)`: Retrieves the folder structure from the browser's local storage.
* `saveFoldersData(data, callback)`: Saves changes (new folders, added chats) to local storage.

### Data Acquisition
* `getActiveChatTitle()`: Reads the Gemini sidebar DOM to obtain the real title of the active conversation.
* `saveCurrentChat(folderName)`: Saves the current chat's ID and title into the specified folder.
* `createNewFolderOnly()`: Creates a new empty folder in the archive.

### Backup (Import/Export)
* `exportData()`: Generates a `.json` file containing all folders and downloads it to the device.
* `triggerImport()`: Opens a file selector to load a `.json` backup and restore folders.

### Navigation
* `openChatSmart(chatId, event)`: Critical function for User Experience. It attempts to find the requested chat in Gemini's original sidebar and simulates a physical click. This preserves the Single Page Application (SPA) state, avoiding annoying page reloads.

### User Interface (UI)
* `renderFolders()`: The main rendering function. Clears the custom container and rebuilds it from scratch based on updated data. Uses CSS variables and classes to handle dynamic colors.
* `renderBackupButtons()`: Adds Export/Import buttons at the bottom of the panel.
* `injectSidebar()`: Identifies the correct anchor point in the Google Gemini DOM (`conversations-list`) and inserts the folder panel.

### Initialization
* `MutationObserver`: An observer that monitors changes in the page body to ensure the folder panel is re-inserted if Gemini redraws its interface.

## Installation (Developer Mode)

1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (top right).
4.  Click on **Load unpacked**.
5.  Select the project folder.
