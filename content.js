/* =========================================
   GEMINI FOLDERS - CONTENT SCRIPT
   Manages UI, Local Storage, Backup, and SPA Navigation
   ========================================= */

console.log("Gemini Folders: Loaded");

// --- 1. STORAGE UTILITIES (LOCAL) ---

/**
 * Retrieves the entire folders object from chrome.storage.local.
 * Data resides only on the current device.
 * @param {function} callback - Function to execute with the retrieved data.
 */
function getFolders(callback) {
    chrome.storage.local.get(['geminiFolders'], function(result) {
        callback(result.geminiFolders || { folders: {} });
    });
}

/**
 * Saves the updated folders object to local storage.
 * @param {object} data - The complete object to save.
 * @param {function} callback - Optional post-save callback.
 */
function saveFoldersData(data, callback) {
    chrome.storage.local.set({geminiFolders: data}, callback);
}

// --- 2. DATA EXTRACTION & CREATION ---

/**
 * Attempts to retrieve the real title of the active chat by parsing the Gemini sidebar.
 * If the selected chat is not found in the DOM, falls back to the page title.
 * @returns {string} The chat title.
 */
function getActiveChatTitle() {
    const selectedChat = document.querySelector('.conversation.selected .conversation-title');
    if (selectedChat && selectedChat.innerText) {
        return selectedChat.innerText.trim();
    }
    return document.title.replace('Gemini - ', '').replace('Gemini', 'New Chat');
}

/**
 * Saves the currently open chat into a specific folder.
 * Extracts ID from URL and title from DOM.
 * @param {string} folderName - The destination folder name.
 */
function saveCurrentChat(folderName) {
    const currentUrl = window.location.href;
    const match = currentUrl.match(/\/app\/([a-zA-Z0-9]+)/);
    
    if (!match) {
        alert("Error: Please open a specific chat before saving. (Are you on the Home page?)");
        return;
    }
    
    const chatId = match[1];
    const realTitle = getActiveChatTitle(); 

    getFolders((data) => {
        if (!data.folders[folderName]) data.folders[folderName] = [];
        
        // Check for duplicates
        const exists = data.folders[folderName].some(c => c.id === chatId);
        
        if (!exists) {
            data.folders[folderName].push({ id: chatId, title: realTitle });
            saveFoldersData(data, () => {
                renderFolders(); 
                console.log(`Saved: "${realTitle}" in ${folderName}`);
            });
        } else {
            alert("This chat is already in the folder.");
        }
    });
}

/**
 * Creates a new empty folder without saving any chat.
 */
function createNewFolderOnly() {
    const name = prompt("New folder name:");
    if (!name) return;

    getFolders((data) => {
        if (data.folders[name]) {
            alert("A folder with this name already exists.");
            return;
        }
        data.folders[name] = [];
        saveFoldersData(data, renderFolders);
    });
}

// --- 3. BACKUP UTILITIES (IMPORT/EXPORT) ---

/**
 * Exports the current configuration to a downloadable JSON file.
 * Useful for backup or transfer to other devices.
 */
function exportData() {
    getFolders((data) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = "gemini-folders-backup.json";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    });
}

/**
 * Imports configuration from a user-uploaded JSON file.
 * Overwrites existing data upon confirmation.
 */
function triggerImport() {
    // Create invisible temp file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (importedData.folders) {
                    if(confirm("Importing will overwrite existing folders. Continue?")) {
                        saveFoldersData(importedData, () => {
                            alert("Import completed successfully!");
                            renderFolders();
                        });
                    }
                } else {
                    alert("Error: The file does not appear to be a valid Gemini Folders backup.");
                }
            } catch (err) {
                alert("Error reading JSON file.");
                console.error(err);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// --- 4. NAVIGATION LOGIC (SPA) ---

/**
 * Handles smart chat opening while preserving SPA state.
 * Attempts to find the chat DOM element and click it for smooth navigation.
 * @param {string} chatId - The chat ID to open.
 * @param {Event} event - The original click event.
 */
function openChatSmart(chatId, event) {
    event.preventDefault(); 
    
    const allChats = document.querySelectorAll('[data-test-id="conversation"]');
    let foundAndClicked = false;

    // Scan original sidebar to find the matching element
    for (let chatEl of allChats) {
        const elementHtml = chatEl.outerHTML;
        if (elementHtml.includes(chatId)) {
            chatEl.click(); // SPA Navigation (fast)
            foundAndClicked = true;
            break;
        }
    }

    // Fallback: Standard navigation (page reload)
    if (!foundAndClicked) {
        window.location.href = `https://gemini.google.com/app/${chatId}`;
    }
}

// --- 5. MANAGEMENT (CRUD) ---

/**
 * Deletes a folder and all its contents.
 * @param {string} folderName - Name of the folder to delete.
 */
function deleteFolder(folderName) {
    if (confirm(`Delete folder "${folderName}"?`)) {
        getFolders((data) => {
            delete data.folders[folderName];
            saveFoldersData(data, renderFolders);
        });
    }
}

/**
 * Renames an existing folder.
 * @param {string} oldName - Current folder name.
 */
function renameFolder(oldName) {
    const newName = prompt("New folder name:", oldName);
    if (newName && newName !== oldName) {
        getFolders((data) => {
            if (data.folders[newName]) {
                alert("A folder with this name already exists.");
                return;
            }
            // Transfer data to new key and remove old one
            data.folders[newName] = data.folders[oldName];
            delete data.folders[oldName];
            saveFoldersData(data, renderFolders);
        });
    }
}

/**
 * Removes a single chat link.
 * @param {string} folderName - Parent folder.
 * @param {string} chatId - ID of the chat.
 */
function deleteChat(folderName, chatId) {
    if (confirm("Remove this chat link?")) {
        getFolders((data) => {
            data.folders[folderName] = data.folders[folderName].filter(c => c.id !== chatId);
            saveFoldersData(data, renderFolders);
        });
    }
}

/**
 * Renames the display title of a saved chat.
 * @param {string} folderName - Parent folder.
 * @param {string} chatId - Chat ID.
 * @param {string} oldTitle - Current title.
 */
function renameChat(folderName, chatId, oldTitle) {
    const newTitle = prompt("Rename chat link:", oldTitle);
    if (newTitle && newTitle !== oldTitle) {
        getFolders((data) => {
            const chatIndex = data.folders[folderName].findIndex(c => c.id === chatId);
            if (chatIndex > -1) {
                data.folders[folderName][chatIndex].title = newTitle;
                saveFoldersData(data, renderFolders);
            }
        });
    }
}

// --- 6. UI RENDERING ---

/**
 * Builds and injects the folder UI into the DOM.
 * Uses CSS classes for theme support.
 */
function renderFolders() {
    const container = document.getElementById('gemini-folders-container');
    if (!container) return;

    container.innerHTML = '<div class="folders-heading">Gemini Folders</div>';

    getFolders((data) => {
        const folders = data.folders;
        const folderNames = Object.keys(folders);

        // Empty state: show button to create first folder
        if (folderNames.length === 0) {
            const btn = document.createElement('button');
            btn.innerText = "+ Create your first folder";
            btn.className = 'empty-state-btn';
            btn.onclick = createNewFolderOnly;
            container.appendChild(btn);
            
            // Render backup buttons even if empty
            renderBackupButtons(container);
            return;
        }

        // Render Folder Loop
        for (const [name, chats] of Object.entries(folders)) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'folder-row';

            // Folder Item (clickable to expand)
            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.innerText = `📂 ${name} (${chats.length})`;
            
            // Folder Actions
            const actionsDiv = document.createElement('div');
            
            // Button: Add Current Chat (+)
            const addCurrentChatBtn = document.createElement('span');
            addCurrentChatBtn.className = 'add-chat-btn';
            addCurrentChatBtn.innerText = '➕';
            addCurrentChatBtn.title = 'Save current chat to this folder';
            addCurrentChatBtn.onclick = (e) => { 
                e.stopPropagation(); 
                saveCurrentChat(name); 
            };

            // Button: Rename Folder
            const renameBtn = document.createElement('span');
            renameBtn.className = 'action-btn';
            renameBtn.innerText = '✏️';
            renameBtn.onclick = (e) => { e.stopPropagation(); renameFolder(name); };

            // Button: Delete Folder
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'action-btn';
            deleteBtn.innerText = '🗑️';
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFolder(name); };

            actionsDiv.appendChild(addCurrentChatBtn);
            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);

            rowDiv.appendChild(folderItem);
            rowDiv.appendChild(actionsDiv);
            container.appendChild(rowDiv);

            // Content Container (Chat List)
            const contentsDiv = document.createElement('div');
            contentsDiv.className = 'folder-contents';
            
            chats.forEach(chat => {
                const chatRow = document.createElement('div');
                chatRow.className = 'chat-row';

                const link = document.createElement('a');
                link.href = `https://gemini.google.com/app/${chat.id}`;
                link.className = 'saved-chat-link';
                link.innerText = chat.title || "Untitled Chat";
                link.onclick = (e) => openChatSmart(chat.id, e);

                const chatActions = document.createElement('div');
                
                // Button: Rename Chat
                const editChatBtn = document.createElement('span');
                editChatBtn.className = 'action-btn';
                editChatBtn.innerText = '✏️';
                editChatBtn.onclick = (e) => { 
                    e.preventDefault(); 
                    renameChat(name, chat.id, chat.title); 
                };

                // Button: Remove Chat
                const delChatBtn = document.createElement('span');
                delChatBtn.className = 'action-btn';
                delChatBtn.innerText = '🗑️';
                delChatBtn.onclick = (e) => { 
                    e.preventDefault(); 
                    deleteChat(name, chat.id); 
                };

                chatActions.appendChild(editChatBtn);
                chatActions.appendChild(delChatBtn);

                chatRow.appendChild(link);
                chatRow.appendChild(chatActions);
                contentsDiv.appendChild(chatRow);
            });

            // Expand/Collapse handler
            folderItem.onclick = () => {
                contentsDiv.classList.toggle('open');
            };

            container.appendChild(contentsDiv);
        }
        
        // "New Folder" Button
        const addBtn = document.createElement('div');
        addBtn.className = 'folder-item new-folder-btn'; 
        addBtn.innerText = "📁+ New Folder"; 
        addBtn.onclick = createNewFolderOnly; 
        container.appendChild(addBtn);

        // Render backup buttons at the end
        renderBackupButtons(container);
    });
}

/**
 * Adds Import/Export buttons to the UI.
 */
function renderBackupButtons(container) {
    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'settings-row';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'backup-btn';
    exportBtn.innerHTML = '⬇️ Export';
    exportBtn.title = 'Save folder backup';
    exportBtn.onclick = exportData;

    const importBtn = document.createElement('button');
    importBtn.className = 'backup-btn';
    importBtn.innerHTML = '⬆️ Import';
    importBtn.title = 'Load backup from file';
    importBtn.onclick = triggerImport;

    settingsDiv.appendChild(exportBtn);
    settingsDiv.appendChild(importBtn);
    container.appendChild(settingsDiv);
}

/**
 * Initialization function that looks for the sidebar injection point.
 */
function injectSidebar() {
    const target = document.querySelector('conversations-list');
    
    if (target && !document.getElementById('gemini-folders-container')) {
        const myContainer = document.createElement('div');
        myContainer.id = 'gemini-folders-container';
        target.prepend(myContainer);
        renderFolders();
    }
}

// --- 7. INITIALIZATION & OBSERVER ---

// Observer to handle Gemini's dynamic loading (SPA)
const observer = new MutationObserver(() => {
    injectSidebar();
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(injectSidebar, 2000);
