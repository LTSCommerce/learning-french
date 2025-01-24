(function () { // Start of IIFE

    $(document).ready(function () {

        // ------------------------------------------------------------------------
        // Configuration
        // ------------------------------------------------------------------------

        const config = {
            localStorageKey: "frenchWordList",
            pixabayApiKey: "48411023-77af553a827e1673d414ebb53", // TODO: Consider a more secure way to store this
            blacklistKey: "pixabayBlacklist",
            availableLists: ["list1.txt", "adulting.txt", "home.txt"], // Hardcoded list of available files
            maxImageLoadFailures: 5,
        };

        // ------------------------------------------------------------------------
        // DOM Elements
        // ------------------------------------------------------------------------

        const dom = {
            inputArea: $("#input-area"),
            wordListTextarea: $("#word-list"),
            generateButton: $("#generate-button"),
            slideshowContainer: $("#slideshow-container"),
            navigationButtons: $("#navigation-buttons"),
            prevButton: $("#prev-button"),
            nextButton: $("#next-button"),
            shuffleButton: $("#shuffle-button"),
            editButton: $("#edit-button"),
            errorMessage: $("#error-message"),
            listSelector: $("#list-selector"),
            loadListButton: $("#load-list-button"),
            guessableRulesDiv: $("#guessable-rules"),
            clearListButton: $("#clear-list-button")
        };

        // ------------------------------------------------------------------------
        // Variables
        // ------------------------------------------------------------------------

        let slides = [];
        let currentSlideIndex = 0;
        let imageLoadFailures = 0;
        let imageLoadingEnabled = true;

        // ------------------------------------------------------------------------
        // Helper Functions - Local Storage
        // ------------------------------------------------------------------------

        // Function to get item from local storage with error handling
        function getLocalStorageItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.error("Error accessing localStorage:", e);
                displayErrorMessage("Error accessing local storage. See console for details.");
                return null;
            }
        }

        // Function to set item in local storage with error handling
        function setLocalStorageItem(key, value) {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                console.error("Error setting localStorage:", e);
                displayErrorMessage("Error saving to local storage. See console for details.");
            }
        }

        // Function to remove item from local storage with error handling
        function removeLocalStorageItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error("Error removing from localStorage:", e);
                displayErrorMessage("Error removing from local storage. See console for details.");
            }
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Image Blacklist
        // ------------------------------------------------------------------------

        // Function to get the image blacklist from local storage
        function getImageBlacklist() {
            const blacklistString = getLocalStorageItem(config.blacklistKey);
            return blacklistString ? JSON.parse(blacklistString) : [];
        }

        // Function to save the image blacklist to local storage
        function saveImageBlacklist(blacklist) {
            setLocalStorageItem(config.blacklistKey, JSON.stringify(blacklist));
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Error Handling
        // ------------------------------------------------------------------------

        function displayErrorMessage(message) {
            dom.errorMessage.text(message);
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Gender Guessing
        // ------------------------------------------------------------------------

        // Function to determine if the gender is "guessable" based on the noun's ending
        function isGuessable(frenchWord, prefix) {
            const lowerCaseWord = frenchWord.toLowerCase();
            let expectedGender = null;

            if (lowerCaseWord.endsWith('e') || lowerCaseWord.endsWith('ion')) {
                // Likely feminine, unless it's an exception
                if (lowerCaseWord.endsWith('age') || lowerCaseWord.endsWith('ege') || lowerCaseWord.endsWith('é') ||
                    lowerCaseWord.endsWith('isme')) {
                    expectedGender = 'masculine'; // Exception: Likely masculine
                } else {
                    expectedGender = 'feminine'; // Likely feminine
                }
            } else {
                expectedGender = 'masculine'; // Likely masculine
            }

            // Determine actual gender from prefix
            let actualGender = null;
            if (["le", "un"].includes(prefix)) {
                actualGender = 'masculine';
            } else if (["la", "une"].includes(prefix)) {
                actualGender = 'feminine';
            } else {
                console.warn("Unexpected prefix:", prefix); // Should not happen due to validation
                return false; // Treat as not guessable
            }

            return expectedGender === actualGender; // Return true if guess matches actual
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Data Loading and Validation
        // ------------------------------------------------------------------------

        // Function to load list from file and validate
        function loadListFromFile(filename) {
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
                        parsed = splitLine(line)
                        if(parsed === null){
                            return;
                        }
                        validLines.push(line);
                    });

                    dom.wordListTextarea.val(validLines.join('\n')); // Replace existing content
                    setLocalStorageItem(config.localStorageKey, dom.wordListTextarea.val()); // Update local storage

                })
                .catch(error => {
                    displayErrorMessage(`Error loading list from ${filename}. See console for details.`);
                    console.error("Error loading list:", error);
                });
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Array Manipulation
        // ------------------------------------------------------------------------

        // Fisher-Yates shuffle algorithm
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]]; // Swap elements
            }
        }

        function compareStringsIgnoreAccents(str1, str2) {
            // Normalize both strings by removing accents and converting to lowercase
            let normalizedStr1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            let normalizedStr2 = str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
            return normalizedStr1 === normalizedStr2;
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Slide Generation
        // ------------------------------------------------------------------------

        // Function to generate the HTML content for a slide
        function generateSlideContent(englishWord, isPlural, wordWithOne,wordWithDefiniteArticle, possessiveArticle,
            frenchWord, guessableText) {            

            let cognate='';
            if(compareStringsIgnoreAccents(englishWord,frenchWord)){
                cognate='<span class="flashy-text" title="this word is a cognate"><a href="https://docs.steinhardt.nyu.edu/pdfs/metrocenter/xr1/glossaries/ELA/GlossaryCognatesFrenchUpdated5-5-2014.pdf" target="_blank">cognate</a></span>';
            }
            const englishWordDisplay = `<span class="english-word hidden" data-revealed="false">${englishWord} ${cognate}</span>`;

            // Construct the URLs
            const googleTranslateURL = `https://translate.google.co.uk/?sl=fr&tl=en&text=${encodeURIComponent(frenchWord)}&op=translate}`;
            const wordReferenceURL = `https://www.wordreference.com/fren/${encodeURIComponent(frenchWord)}`;
            const forvoURL = `https://forvo.com/word/${encodeURIComponent(frenchWord)}/#fr`;
            const lingueeURL = `https://www.linguee.com/french-english/search?source=auto&query=${encodeURIComponent(frenchWord)}`;

            const frenchWords=isPlural
            ?`
                <p>${wordWithDefiniteArticle}</p>
            `
            :`
                <p>${wordWithOne}</p>
                <p>${wordWithDefiniteArticle}</p>
                <p>${possessiveArticle} ${frenchWord}</p>
            `

            return `
            <div class="text-container">
                <p><b style="font-size:1.2em">${englishWordDisplay}</b></p>
                ${frenchWords}
                <p>${guessableText} - <a href="#guessable-rules">Learn more</a></p>
                <div class="slide-buttons">
                    <a href="${googleTranslateURL}" target="_blank">Google Translate</a>
                    <a href="${wordReferenceURL}" target="_blank">WordReference</a>
                    <a href="${forvoURL}" target="_blank">Pronunciation (Forvo)</a>
                    <a href="${lingueeURL}" target="_blank">Linguee</a>
                    <button class="delete-image-button" data-frenchword="${frenchWord}">Delete Image</button>
                </div>
            </div>
            <div class="image-placeholder">?</div>
        `;
        }

        async function loadImageForSlide(slide) {
            if (!imageLoadingEnabled) {
                console.warn("Image loading is disabled.  Skipping image load for slide.");
                return;
            }

            const englishWord = slide.data("english-word");
            const frenchWord = slide.find(".delete-image-button").data("frenchword"); // Extract frenchWord

            if (!englishWord) {
                console.warn("No English word found for slide.  Cannot load image.");
                return;
            }

            // Abort any existing request
            let abortController = slide.data('abortController');
            if (abortController) {
                console.log("Aborting previous image request for", englishWord);
                abortController.abort();
            }

            abortController = new AbortController();
            slide.data('abortController', abortController); // Store abortController in slide data
            const signal = abortController.signal;

            // Display "Loading image..." placeholder
            updateSlideWithPlaceholder(slide, "...");

            let imageURL = getLocalStorageItem(frenchWord);
            const imageBlacklist = getImageBlacklist();

            // Check if image is blacklisted
            if (imageURL && imageBlacklist.includes(imageURL)) {
                console.warn("Image for", frenchWord, "is blacklisted:", imageURL);
                removeLocalStorageItem(frenchWord); // Remove blacklisted image from cache
                imageURL = null; // Force API call
            }

            if (imageURL) {
                // Image found in local storage
                console.log("Image found in local storage for", frenchWord, ":", imageURL);
                updateSlideWithImage(slide, imageURL);
                return;
            }

            try {
                console.log("Fetching image from Pixabay for", englishWord);
                const response = await $.ajax({
                    url: `https://pixabay.com/api/?key=${config.pixabayApiKey}&q=${encodeURIComponent(englishWord)}&image_type=photo`,
                    dataType: 'jsonp',
                    signal: signal // Pass the AbortSignal to the request
                });

                if (signal.aborted) {
                    console.log("Image request aborted for", englishWord);
                    return;
                }

                if (response.hits.length > 0) {
                    let validImageFound = false;
                    const imageBlacklist = getImageBlacklist();

                    for (let i = 0; i < response.hits.length; i++) {
                        const hit = response.hits[i];
                        if (!imageBlacklist.includes(hit.webformatURL)) {
                            imageURL = hit.webformatURL;
                            validImageFound = true;
                            break;
                        }
                    }

                    if (validImageFound) {
                        console.log("Image found from Pixabay for", englishWord, ":", imageURL);
                        setLocalStorageItem(frenchWord, imageURL); // Save to local storage
                        updateSlideWithImage(slide, imageURL);
                    } else {
                        console.warn("No non-blacklisted images found on Pixabay for", englishWord);
                        updateSlideWithPlaceholder(slide, "No suitable image found");
                    }
                } else {
                    console.warn("No images found on Pixabay for", englishWord);
                    updateSlideWithPlaceholder(slide, "No image found");
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log("Image fetch aborted for", englishWord);
                } else {
                    console.error("Error fetching image for", englishWord, ":", error);
                    imageLoadFailures++;
                    console.log("Image load failures:", imageLoadFailures);

                    if (imageLoadFailures > config.maxImageLoadFailures) {
                        console.warn("Too many image load failures. Disabling image loading.");
                        imageLoadingEnabled = false;
                        displayErrorMessage("Image loading has been disabled due to excessive errors.");
                    }
                    updateSlideWithPlaceholder(slide, "Error loading image");
                }
            }
        }

        function updateSlideWithImage(slide, imageURL) {
            const imageDisplay = `<img src="${imageURL}" alt="${slide.data('english-word')}" class="pixabay-image">`;
            slide.find('.image-placeholder').html(imageDisplay); // Add image inside the placeholder
        }

        function updateSlideWithPlaceholder(slide, message) {
            let content = "?";
            if (message) {
                content = message;
            }
            slide.find('.image-placeholder').html(content); // Set the placeholder text
        }

        function splitLine(line) {
            // Trim the line to remove leading/trailing spaces
            const trimmedLine = line.trim();

            // Return null for empty or commented-out lines (starting with #)
            if (trimmedLine === "" || trimmedLine.startsWith("#")) {
                return null;
            }

            // Regular expression to match the line format
            const regex = /^(.+?)\s+(la|le|un|une|les\(m\)|les\(f\))\s+(.+)$/i;

            // Attempt to match the line against the regex
            const match = trimmedLine.match(regex);

            if (match) {
                // Destructure the matched groups into components
                const [_, englishPhrase, genderPrefix, frenchPhrase] = match;
                return {
                englishPhrase: englishPhrase.trim(),
                genderPrefix: genderPrefix.trim(),
                frenchPhrase: frenchPhrase.trim()
                };
            } else {
                // Log an error if the line is invalid
                console.error("Invalid line format:", line);
                return null;
            }
        }

        // Function to generate a single slide
        async function generateSlide(line) {                    
            parsed=splitLine(line);
            if(null===parsed){
                return null;
            }
            const englishWord = parsed.englishPhrase;
            const prefix = parsed.genderPrefix;
            const frenchWord = parsed.frenchPhrase;

            if (["le", "un", "les(m)"].includes(prefix)) {
                genderClass = 'masculine';
            } else if (["la", "une", "les(f)"].includes(prefix)) {
                genderClass = 'feminine';
            }

            const isPlural=(["les(m)","les(f)"].includes(prefix));

            let definiteArticle=prefix;
            if (definiteArticle==="un"){
                definiteArticle="le";
            }else if (definiteArticle="une"){
                definiteArticle="la";
            }

            const startsWithVowelOrH = /^[aeiouh]/i.test(frenchWord);

            if (!isPlural && startsWithVowelOrH && (definiteArticle === "le" || definiteArticle === "la")) {
                definiteArticle = "l'"; // Contract the article
            } else {
                definiteArticle = `${definiteArticle} `; // add a space
            }

            
            const possessiveArticle = (genderClass === 'masculine') ? "son" : "ta";
            const wordWithDefiniteArticle = definiteArticle + frenchWord;
            const wordWithOne = (genderClass === 'masculine') ? "un " + frenchWord : "une " + frenchWord;

            const guessable = isGuessable(frenchWord, prefix);
            let guessableText = guessable ? "✅ Guessable" : "❌ Not Guessable";

            // Image Handling - Store English word for later loading
            const slideContent = generateSlideContent(englishWord, isPlural, wordWithOne, wordWithDefiniteArticle,
                possessiveArticle, frenchWord, guessableText); // No image URL initially

            const slide = $(`<div class="slide ${genderClass}" data-english-word="${englishWord}" data-ever-revealed="false">${slideContent}</div>`);

            // Initialize AbortController early
            slide.data('abortController', new AbortController());

            return slide;
        }

        // ------------------------------------------------------------------------
        // Main Function - Generate Slideshow
        // ------------------------------------------------------------------------

        async function generateSlideshow(wordList) {
            dom.slideshowContainer.empty(); // Clear any existing slides
            slides = []; // Reset the slides array
            currentSlideIndex = 0;
            displayErrorMessage(""); // Clear any previous errors
            imageLoadFailures = 0; // Reset image load failures
            imageLoadingEnabled = true; // Re-enable image loading

            let lines = wordList.split('\n');
            shuffleArray(lines); // Shuffle the array of lines

            let validWordsCount = 0;

            for (const line of lines) {
                const slide = await generateSlide(line);
                if (slide) {
                    dom.slideshowContainer.append(slide);
                    slides.push(slide);
                    validWordsCount++;
                }
            }

            if (validWordsCount === 0) {
                displayErrorMessage("No valid words found in the input.");
                return;
            }

            // Save word list to local storage
            setLocalStorageItem(config.localStorageKey, wordList);

            showSlide(0);
            dom.inputArea.hide();
            dom.generateButton.hide();
            dom.slideshowContainer.show(); // Make the slideshow container visible
            dom.navigationButtons.show();
            dom.guessableRulesDiv.show(); // Show the rules div
        }

        // ------------------------------------------------------------------------
        // Helper Function - Slide Display
        // ------------------------------------------------------------------------

        function showSlide(index) {
            if (index < 0) {
                currentSlideIndex = slides.length - 1;
            } else if (index >= slides.length) {
                currentSlideIndex = 0;
            } else {
                currentSlideIndex = index;
            }

            $(".slide").removeClass("active");
            const currentSlide = slides[currentSlideIndex];
            currentSlide.addClass("active");

            // Load image when slide becomes active, but only if the english word has been revealed
            // or if it was ever revealed before
            const englishWordSpan = currentSlide.find(".english-word");
            const everRevealed = currentSlide.data("ever-revealed");

            if (!englishWordSpan.hasClass("hidden") || everRevealed) {
                loadImageForSlide(currentSlide);
            }
        }

        // ------------------------------------------------------------------------
        // Event Handlers
        // ------------------------------------------------------------------------

        // Generate Slideshow Button Click
        dom.generateButton.click(function () {
            const wordList = dom.wordListTextarea.val();
            generateSlideshow(wordList);
        });

        // Previous Button Click
        dom.prevButton.click(function () {
            showSlide(currentSlideIndex - 1);
        });

        // Next Button Click
        dom.nextButton.click(function () {
            showSlide(currentSlideIndex + 1);
        });

        // Shuffle Button Click
        dom.shuffleButton.click(function () {
            const wordList = dom.wordListTextarea.val();
            generateSlideshow(wordList);
        });

        // Edit Button Click
        dom.editButton.click(function () {
            dom.slideshowContainer.hide();
            dom.navigationButtons.hide();
            dom.guessableRulesDiv.hide(); // Hide the rules div
            dom.inputArea.show();
            dom.generateButton.show();
        });

        // Clear List Button Click
        dom.clearListButton.click(function () {
            dom.wordListTextarea.val("");
            removeLocalStorageItem(config.localStorageKey);
        });

        // Save word list to local storage when the textarea changes
        dom.wordListTextarea.on('input', function () {
            setLocalStorageItem(config.localStorageKey, dom.wordListTextarea.val());
        });

        // Event delegation for dynamically added "Delete Image" buttons
        dom.slideshowContainer.on("click", ".delete-image-button", function () {
            const frenchWord = $(this).data("frenchword");
            const imageURL = getLocalStorageItem(frenchWord); // Get URL before deleting

            if (frenchWord) {
                // Remove from local storage
                removeLocalStorageItem(frenchWord);

                // Add to blacklist
                const blacklist = getImageBlacklist();
                if (imageURL && !blacklist.includes(imageURL)) {
                    blacklist.push(imageURL);
                    saveImageBlacklist(blacklist);
                    console.log("Image blacklisted:", imageURL, "for word:", frenchWord);
                }

                // Re-generate the slideshow to update the current view
                const wordList = dom.wordListTextarea.val();
                generateSlideshow(wordList);
            } else {
                console.warn("French word not found for delete image button.");
            }
        });

        // Interactive English Word Reveal - Single Click to Toggle
        dom.slideshowContainer.on("click", ".english-word", function () {
            const $this = $(this);
            const revealed = $this.data("revealed");
            const slide = $this.closest(".slide");

            if (revealed) {
                // Hide the word
                $this.addClass("hidden");
                $this.data("revealed", false);
            } else {
                // Show the word
                $this.removeClass("hidden");
                $this.data("revealed", true);

                // Set the "ever-revealed" flag to true
                slide.data("ever-revealed", true);

                // Load the image if it's the active slide
                if (slide.hasClass("active")) {
                    loadImageForSlide(slide);
                }
            }
        });


        // ------------------------------------------------------------------------
        // Initialization
        // ------------------------------------------------------------------------

        // Populate the list selector
        config.availableLists.forEach(filename => {
            dom.listSelector.append($("<option>").val(filename).text(filename));
        });

        // Load list on button click
        dom.loadListButton.click(function () {
            const selectedFile = dom.listSelector.val();
            loadListFromFile("./lists/"+selectedFile);
        });

        // Load word list from local storage on page load
        if (getLocalStorageItem(config.localStorageKey)) {
            dom.wordListTextarea.val(getLocalStorageItem(config.localStorageKey));
        }

    });

})(); // End of IIFE