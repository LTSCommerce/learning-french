/**
 * Loads a list from a file and updates the textarea and local storage.
 *
 * @param {string} filename - The name of the file to load.
 * @param {jQuery} textarea - The jQuery object representing the textarea to update.
 * @param {string} localStorageKey - The key to use for local storage.
 * @param {function(string): void} displayErrorMessage - The function to call to display error messages.
 */
export function loadListFromFile(filename, textarea, localStorageKey, displayErrorMessage) {
    fetch(filename)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load file: ${filename} (status ${response.status})`);
            }
            return response.text();
        })
        .then(text => {
            if (!text) {
                displayErrorMessage(`File ${filename} is empty.`);
                console.warn(`File ${filename} is empty.`);
                return;
            }

            let validLines = [];
            const lines = text.split('\n');

            lines.forEach(line => {
                if (line.trim() !== "" && !line.trim().startsWith("#")) {
                    validLines.push(line);
                }
            });

            textarea.val(validLines.join('\n')); // Replace existing content
            localStorage.setItem(localStorageKey, textarea.val()); // Update local storage

        })
        .catch(error => {
            displayErrorMessage(`Error loading list from ${filename}. See console for details.`);
            console.error("Error loading list:", error);
        });
}

/**
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }

    return matrix[b.length][a.length];
}


/**
 * Determines if the gender of a French word is "guessable" based on the noun's ending.
 *
 * @param {string} frenchWord - The French word to check.
 * @param {string} prefix - The prefix indicating the gender (e.g., "le", "la", "un", "une").
 * @returns {boolean} - Returns true if the gender is guessable, otherwise false.
 */
export function isGuessable(frenchWord, prefix) {
    const lowerCaseWord = frenchWord.toLowerCase();
    let expectedGender = null;

    if (lowerCaseWord.endsWith('e') || lowerCaseWord.endsWith('ion')) {
        // Likely feminine, unless it's an exception
        if (lowerCaseWord.endsWith('age') || lowerCaseWord.endsWith('ege') || lowerCaseWord.endsWith('é') || lowerCaseWord.endsWith('isme')) {
            expectedGender = 'masculine'; // Exception: Likely masculine
        } else {
            expectedGender = 'feminine'; // Likely feminine
        }
    } else {
        expectedGender = 'masculine'; // Likely masculine
    }

    // Determine actual gender from prefix
    let actualGender = null;
    if (["le", "un", "les(m)"].includes(prefix)) {
        actualGender = 'masculine';
    } else if (["la", "une", "les(f)"].includes(prefix)) {
        actualGender = 'feminine';
    } else {
        console.warn("Unexpected prefix:", prefix); // Should not happen due to validation
        return false; // Treat as not guessable
    }

    return expectedGender === actualGender; // Return true if guess matches actual
}

/**
 * Determines if the English and French words are cognates.
 *
 * @param {string} englishWord - The English word to check.
 * @param {string} frenchWord - The French word to check.
 * @returns {boolean} - Returns true if the words are cognates, otherwise false.
 */
export function isCognate(englishWord, frenchWord) {
    // Normalize both strings by removing accents and converting to lowercase
    let engNormal = englishWord
        .replace(/^(male |female )/, '')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    let frNormal = frenchWord
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    return engNormal === frNormal;
}