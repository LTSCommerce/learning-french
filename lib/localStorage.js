/**
 * Retrieves an item from local storage.
 *
 * @param {string} key - The key of the item to retrieve.
 * @param {function} displayErrorMessage - Function to display error messages.
 * @returns {string|null} The value of the item, or null if an error occurs.
 */
export function getLocalStorageItem(key, displayErrorMessage) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.error("Error accessing localStorage:", e);
        displayErrorMessage("Error accessing local storage. See console for details.");
        return null;
    }
}

/**
 * Sets an item in local storage with error handling.
 *
 * @param {string} key - The key of the item to set.
 * @param {string} value - The value of the item to set.
 * @param {function} displayErrorMessage - Function to display error messages.
 * @return {void}
 */
export function setLocalStorageItem(key, value, displayErrorMessage) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.error("Error setting localStorage:", e);
        displayErrorMessage("Error saving to local storage. See console for details.");
    }
}

/**
 * Removes an item from local storage with error handling.
 *
 * @param {string} key - The key of the item to remove.
 * @param {function} displayErrorMessage - Function to display error messages.
 * @return {void}
 */
export function removeLocalStorageItem(key, displayErrorMessage) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error("Error removing from localStorage:", e);
        displayErrorMessage("Error removing from local storage. See console for details.");
    }
}