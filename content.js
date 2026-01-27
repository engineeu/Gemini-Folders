/* =========================================
   GEMINI FOLDERS - CONTENT SCRIPT
   Manages UI, Local Storage, Backup, and SPA Navigation
   ========================================= */

console.log("Gemini Folders: Loaded");

// --- 1. STORAGE UTILITIES (LOCAL) ---

/**
 * Retrieves the folder structure from Chrome's local storage.
 * returns Default: { folders: {} } if no data is found.
 */
function getFolders(callback) {
    chrome.storage.local.get(['geminiFolders'], function(result) {
        callback(result.geminiFolders || { folders: {} });
    });
}

/**
 * Saves the updated folder structure to Chrome's local storage.
 */
function saveFoldersData(data, callback) {
    chrome.storage.local.set({geminiFolders: data}, callback);
}

// --- 2. DATA EXTRACTION & CREATION ---

/**
 * Extracts the title of the currently active chat from the DOM.
 * Fallback: Uses the document title if the sidebar element is not found.
 */
function getActiveChatTitle() {
    const selectedChat = document.querySelector('.conversation.selected .conversation-title');
    if (selectedChat && selectedChat.innerText) {
        return selectedChat.innerText.trim();
    }
    return document.title.replace('Gemini - ', '').replace('Gemini', 'New Chat');
}

/**
 * Saves the current chat ID and title into the specified folder.
 * Prevents duplicates based on chat ID.
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
 * Prompts user for a name and creates a new empty folder.
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
 * Exports the current folder structure as a JSON file download.
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
 * Triggers a hidden file input to upload and parse a JSON backup file.
 * Warning: Overwrites existing local data.
 */
function triggerImport() {
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
 * Navigates to a chat without reloading the page if possible.
 * Tries to click the existing sidebar element (SPA behavior); falls back to URL redirection.
 */
function openChatSmart(chatId, event) {
    event.preventDefault(); 
    
    const allChats = document.querySelectorAll('[data-test-id="conversation"]');
    let foundAndClicked = false;

    for (let chatEl of allChats) {
        const elementHtml = chatEl.outerHTML;
        if (elementHtml.includes(chatId)) {
            chatEl.click(); 
            foundAndClicked = true;
            break;
        }
    }

    if (!foundAndClicked) {
        window.location.href = `https://gemini.google.com/app/${chatId}`;
    }
}

// --- 5. MANAGEMENT (CRUD) ---

/**
 * Deletes a folder by name.
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
 */
function renameFolder(oldName) {
    const newName = prompt("New folder name:", oldName);
    if (newName && newName !== oldName) {
        getFolders((data) => {
            if (data.folders[newName]) {
                alert("A folder with this name already exists.");
                return;
            }
            data.folders[newName] = data.folders[oldName];
            delete data.folders[oldName];
            saveFoldersData(data, renderFolders);
        });
    }
}

/**
 * Removes a specific chat link from a folder.
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
 * Renames the display title of a saved chat link.
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

// --- 6. UI RENDERING & THEME DETECTION ---

/**
 * Analyzes the body background brightness to toggle dark mode class.
 * Ensures the extension UI matches the actual rendered Gemini theme.
 */
function detectTheme() {
    const container = document.getElementById('gemini-folders-container');
    if (!container) return;

    // Get the background color of the body
    const style = window.getComputedStyle(document.body);
    const bgColor = style.backgroundColor; 

    // Parse RGB values
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
        const r = parseInt(rgb[0]);
        const g = parseInt(rgb[1]);
        const b = parseInt(rgb[2]);
        
        // Calculate brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const isDark = brightness < 128;
        
        // Apply class only if state changes
        const hasClass = container.classList.contains('gf-dark-mode');

        if (isDark && !hasClass) {
            container.classList.add('gf-dark-mode');
        } else if (!isDark && hasClass) {
            container.classList.remove('gf-dark-mode');
        }
    }
}

/**
 * Main rendering function.
 * Rebuilds the folder list, chats, and buttons based on current data.
 */
function renderFolders() {
    const container = document.getElementById('gemini-folders-container');
    if (!container) return;

    detectTheme();

    container.innerHTML = '<div class="folders-heading">Gemini Folders</div>';

    getFolders((data) => {
        const folders = data.folders;
        const folderNames = Object.keys(folders);

        if (folderNames.length === 0) {
            const btn = document.createElement('button');
            btn.innerText = "+ Create your first folder";
            btn.className = 'empty-state-btn';
            btn.onclick = createNewFolderOnly;
            container.appendChild(btn);
            renderBackupButtons(container);
            return;
        }

        for (const [name, chats] of Object.entries(folders)) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'folder-row';

            const folderItem = document.createElement('div');
            folderItem.className = 'folder-item';
            folderItem.innerText = `📂 ${name} (${chats.length})`;
            
            const actionsDiv = document.createElement('div');
            
            const addCurrentChatBtn = document.createElement('span');
            addCurrentChatBtn.className = 'add-chat-btn';
            addCurrentChatBtn.innerText = '➕';
            addCurrentChatBtn.title = 'Save current chat to this folder';
            addCurrentChatBtn.onclick = (e) => { 
                e.stopPropagation(); 
                saveCurrentChat(name); 
            };

            const renameBtn = document.createElement('span');
            renameBtn.className = 'action-btn';
            renameBtn.innerText = '✏️';
            renameBtn.onclick = (e) => { e.stopPropagation(); renameFolder(name); };

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

            const contentsDiv = document.createElement('div');
            contentsDiv.className = 'folder-contents';
            
            chats.forEach(chat => {
                const chatRow = document.createElement('div');
                chatRow.className = 'chat-row';

                const link = document.createElement('a');
                link.href = `https://gemini.google.com/app/${chat.id}`;
                link.className = 'saved-chat-link';
                link.innerText = chat.title || "Untitled Chat";
                link.title = chat.title || "Untitled Chat";
                link.onclick = (e) => openChatSmart(chat.id, e);

                const chatActions = document.createElement('div');
                
                const editChatBtn = document.createElement('span');
                editChatBtn.className = 'action-btn';
                editChatBtn.innerText = '✏️';
                editChatBtn.onclick = (e) => { 
                    e.preventDefault(); 
                    renameChat(name, chat.id, chat.title); 
                };

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

            folderItem.onclick = () => {
                contentsDiv.classList.toggle('open');
            };

            container.appendChild(contentsDiv);
        }
        
        const addBtn = document.createElement('div');
        addBtn.className = 'folder-item new-folder-btn'; 
        addBtn.innerText = "📁+ New Folder"; 
        addBtn.onclick = createNewFolderOnly; 
        container.appendChild(addBtn);

        renderBackupButtons(container);
    });
}

/**
 * Appends Import and Export buttons to the container.
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
 * Injects the extension container into the Gemini sidebar DOM.
 * Target: 'conversations-list' element.
 */
function injectSidebar() {
    const target = document.querySelector('conversations-list');
    
    // Only inject if it doesn't exist yet
    if (target && !document.getElementById('gemini-folders-container')) {
        const myContainer = document.createElement('div');
        myContainer.id = 'gemini-folders-container';
        target.prepend(myContainer);
        renderFolders();
    }
}

// --- 7. INITIALIZATION & OBSERVER ---

/**
 * Utility to limit function execution frequency (prevents UI freezes).
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Observer callback to handle DOM mutations.
 * Re-injects sidebar and checks theme when Gemini updates its UI.
 */
const handleMutations = debounce(() => {
    injectSidebar();
    detectTheme();
}, 200); 

const observer = new MutationObserver(handleMutations);

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection attempt
setTimeout(() => {
    injectSidebar();
    detectTheme();
}, 2000);