import {isCognate, isGuessable, levenshteinDistance, loadListFromFile} from '../lib/words.js';
import {shuffleArray} from '../lib/arrays.js'
import {getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem} from '../lib/localStorage.js'
import {generateWordLinkButtons} from "../lib/content.js";

(function () { // Start of IIFE

    $(document).ready(async function () {

        // ------------------------------------------------------------------------
        // Configuration
        // ------------------------------------------------------------------------

        const config = {
            localStorageKey: "frenchWordList",
            pixabayApiKey: "48411023-77af553a827e1673d414ebb53", // TODO: Consider a more secure way to store this
            blacklistKey: "pixabayBlacklist",
            availableLists: ["list1.txt", "adulting.txt", "home.txt"], // Hardcoded list of available files
            maxImageLoadFailures: 5,
            msBetweenWords: 200,
            closenessThreshold: 3
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
            clearListButton: $("#clear-list-button"),
            title: $('#title'),
            maleVoiceSelect: $("#male-voice-select"),
            maleVoicePlay: $("#male-voice-play"),
            femaleVoicePlay: $("#female-voice-play"),
            femaleVoiceSelect: $("#female-voice-select")
        };

        // ------------------------------------------------------------------------
        // Variables
        // ------------------------------------------------------------------------

        let slides = [];
        let currentSlideIndex = 0;
        let imageLoadFailures = 0;
        let imageLoadingEnabled = true;
        let maleVoice = null;
        let femaleVoice = null;
        const voices = await loadVoices();

        // Define the localConfig object and helper functions
        const localConfig = {
            key: 'appConfig',
            data: {
                maleVoice: null,
                femaleVoice: null
            },
            load() {
                const storedConfig = getLocalStorageItem(this.key, displayErrorMessage)
                console.log({storedConfig: storedConfig});
                if (storedConfig) {
                    try {
                        const parsedConfig = JSON.parse(storedConfig);
                        this.data.maleVoice = parsedConfig.maleVoice;
                        this.data.femaleVoice = parsedConfig.femaleVoice;
                    } catch (e) {
                        console.error("Error parsing storedConfig:", e);
                        console.debug(storedConfig)
                    }
                }
            },
            save() {
                const configToSave = {
                    maleVoice: this.data.maleVoice ? {
                        name: this.data.maleVoice.name,
                        lang: this.data.maleVoice.lang,
                        voiceURI: this.data.maleVoice.voiceURI
                    } : null,
                    femaleVoice: this.data.femaleVoice ? {
                        name: this.data.femaleVoice.name,
                        lang: this.data.femaleVoice.lang,
                        voiceURI: this.data.femaleVoice.voiceURI
                    } : null
                };
                console.log('saving to local storage:', configToSave);
                setLocalStorageItem(this.key, JSON.stringify(configToSave), displayErrorMessage)
            }
        };


        // ------------------------------------------------------------------------
        // Helper Functions - Speech
        // ------------------------------------------------------------------------


        async function loadVoices() {
            return new Promise((resolve) => {
                let voices = window.speechSynthesis.getVoices();
                if (voices.length !== 0) {
                    resolve(voices.filter(voice => voice.lang === 'fr-FR'));
                } else {
                    window.speechSynthesis.onvoiceschanged = () => {
                        voices = window.speechSynthesis.getVoices();
                        resolve(voices.filter(voice => voice.lang === 'fr-FR'));
                    };
                }
            });
        }

// Populate voice pickers and set default voices from localConfig
        function populateVoicePickers(voices) {

            console.log('voices', voices);
            voices.forEach(voice => {
                console.log('adding voice to select', {voice: voice});
                const option = `<option value="${voice.name}">${voice.name}</option>`;
                dom.maleVoiceSelect.append(option);
                dom.femaleVoiceSelect.append(option);
            });

            // Set default voices from localConfig
            if (localConfig.data.maleVoice && localConfig.data.maleVoice.name) {
                console.log('found local config for maleVoice', localConfig.data.maleVoice);
                dom.maleVoiceSelect.val(localConfig.data.maleVoice.name);
                maleVoice = voices.find(voice => voice.name === localConfig.data.maleVoice.name);
            } else {
                let defaultMaleVoice = voices.find(voice => voice.name.includes("+male"));
                console.log('defaultMaleVoice', defaultMaleVoice)
                if (defaultMaleVoice === undefined) {
                    defaultMaleVoice = voices[0];
                }
                if (defaultMaleVoice) {
                    console.log({defaultMaleVoice: defaultMaleVoice});
                    dom.maleVoiceSelect.val(defaultMaleVoice.name);
                    maleVoice = defaultMaleVoice;
                    localConfig.data.maleVoice = defaultMaleVoice;
                }
            }

            if (localConfig.data.femaleVoice && localConfig.data.femaleVoice.name) {
                console.log('found local config for femaleVoice', localConfig.data.femaleVoice);
                dom.femaleVoiceSelect.val(localConfig.data.femaleVoice.name);
                femaleVoice = voices.find(voice => voice.name === localConfig.data.femaleVoice.name);
            } else {
                let defaultFemaleVoice = voices.find(voice => voice.name.includes("+female"));
                if (defaultFemaleVoice === undefined) {
                    defaultFemaleVoice = voices[0];
                }
                if (defaultFemaleVoice) {
                    console.log({defaultFemaleVoice: defaultFemaleVoice})
                    dom.femaleVoiceSelect.val(defaultFemaleVoice.name);
                    femaleVoice = defaultFemaleVoice;
                    localConfig.data.femaleVoice = defaultFemaleVoice;
                }
            }

            localConfig.save();
        }

        // Play voice sample in voice picker
        function playVoiceSample(voice, gender) {
            console.log('playing voice sample', {voice: voice});
            if (voice === null) {
                console.error('voice is null');
                return;
            }
            const utterance = new SpeechSynthesisUtterance(`Bonjour, je m'appelle ${voice.name}`);
            utterance.voice = voice;
            utterance.pitch = gender === 'masculine' ? 0.8 : 1.5;
            window.speechSynthesis.speak(utterance);
        }

        // Function to read out french words on slides
        function speak(text, gender) {
            const utterance = new SpeechSynthesisUtterance(text);
            const voice = gender === 'masculine' ? maleVoice : femaleVoice;
            if (voice === null) {
                console.error('voice is null');
                return;
            }
            utterance.voice = voice
            utterance.pitch = gender === 'masculine' ? 0.8 : 1.5;
            window.speechSynthesis.speak(utterance);
        }

        // Function to read out all French words on the slide
        function autoPlaySlide(slide) {
            const speakButtons = slide.find(".speak-button");
            let allText = '';
            let gender = '';

            speakButtons.each(function () {
                const button = $(this);
                const text = button.data("text");
                gender = button.data("gender"); // Assuming all buttons have the same gender
                allText += text + '; '; // Double space between each chunk
            });

            // Trim the trailing spaces
            allText = allText.trim();

            // Call speak once with the concatenated text
            speak(allText, gender);
        }


        // ------------------------------------------------------------------------
        // Helper Functions - Image Blacklist
        // ------------------------------------------------------------------------

        // Function to get the image blacklist from local storage
        function getImageBlacklist() {
            const blacklistString = getLocalStorageItem(config.blacklistKey, displayErrorMessage);
            return blacklistString ? JSON.parse(blacklistString) : [];
        }

        // Function to save the image blacklist to local storage
        function saveImageBlacklist(blacklist) {
            setLocalStorageItem(config.blacklistKey, JSON.stringify(blacklist), displayErrorMessage);
        }

        // ------------------------------------------------------------------------
        // Helper Functions - Error Handling
        // ------------------------------------------------------------------------

        function displayErrorMessage(message) {
            dom.errorMessage.text(message);
        }


        // ------------------------------------------------------------------------
        // Helper Functions - Slide Generation
        // ------------------------------------------------------------------------

        // word comparison, checking for cognate


        // Function to generate the HTML content for a slide
        function generateSlideContent(genderClass, englishWord, isPlural, prfxOne, wordWithDefiniteArticle, prfxYour, prfxMy, prfxThisthat, prfxSome, frenchWord, guessable) {
            let englishWordExtra = '';
            if (isCognate(englishWord, frenchWord)) {
                englishWordExtra = ' cognate! ';
            } else if (isClose(englishWord, frenchWord)) {
                englishWordExtra = ' close cousins! ';
            }

            const englishWordDisplay = `<div class="english-word">${englishWord} <span class="englishWordExtra">${englishWordExtra}</span></div>`;
            const questionMarksDisplay = `<div class="question-marks">??????</div>`;


            const frenchWords = isPlural
                ? `<p>les ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="les ${frenchWord}">🔊</button></p>
           <p>tes ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="tes ${frenchWord}">🔊</button></p>
           <p>mes ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="mes ${frenchWord}">🔊</button></p>
           <p>ces ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="ces ${frenchWord}">🔊</button></p>
           <p>des ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="des ${frenchWord}">🔊</button></p>`
                : `<p>${prfxOne} ${frenchWord}<button class="speak-button" data-gender="${genderClass}" data-text="${prfxOne} ${frenchWord}">🔊</button></p>
           <p>${wordWithDefiniteArticle} <button class="speak-button" data-gender="${genderClass}" data-text="${wordWithDefiniteArticle}">🔊</button></p>
           <p>${prfxYour} ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="${prfxYour} ${frenchWord}">🔊</button></p>
           <p>${prfxMy} ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="${prfxMy} ${frenchWord}">🔊</button></p>
           <p>${prfxThisthat} ${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="${prfxThisthat} ${frenchWord}">🔊</button></p>
           <p>${prfxSome}${frenchWord} <button class="speak-button" data-gender="${genderClass}" data-text="${prfxSome}${frenchWord}">🔊</button></p>`;

            const guessableText = guessable ? "✅ Guessable" : "❌ Not Guessable";
            const wordButtons = generateWordLinkButtons(frenchWord);
            return `
        <div class="text-container">
            <div class="english-word-container">
                ${englishWordDisplay}
                ${questionMarksDisplay}
            </div>
            <div class="french-words">${frenchWords}</div>
            <p>${guessableText} - <a href="#guessable-rules">Learn more</a></p>
            ${wordButtons}
            
        </div>
        <div class="image-placeholder">?</div>
    `;
        }

        async function loadImageForSlide(slide) {
            if (!imageLoadingEnabled) {
                console.warn("Image loading is disabled. Skipping image load for slide.");
                return;
            }

            const englishWord = slide.data("english-word");
            const localStorageKey = englishWord;
            const imageSearch = englishWord;
            if (!englishWord) {
                console.warn("No English word found for slide. Cannot load image.");
                return;
            }

            // Abort any existing request
            let abortController = slide.data('abortController');
            if (abortController) {
                console.log("Aborting previous image request for", imageSearch);
                abortController.abort();
            }

            abortController = new AbortController();
            slide.data('abortController', abortController); // Store abortController in slide data
            const signal = abortController.signal;

            // Display "Loading image..." placeholder
            updateSlideWithPlaceholder(slide, "...");


            let imageURL = getLocalStorageItem(localStorageKey, displayErrorMessage);
            const imageBlacklist = getImageBlacklist();

            // Check if image is blacklisted
            if (imageURL && imageBlacklist.includes(imageURL)) {
                console.warn("Image for", localStorageKey, "is blacklisted:", imageURL);
                removeLocalStorageItem(localStorageKey, displayErrorMessage); // Remove blacklisted image from cache
                imageURL = null; // Force API call
            }

            if (imageURL) {
                // Image found in local storage
                console.log("Image found in local storage for", localStorageKey, ":", imageURL);
                updateSlideWithImage(slide, imageURL);
                return;
            }

            try {

                console.log("Fetching image from Pixabay for", imageSearch);
                const response = await $.ajax({
                    url: `https://pixabay.com/api/?key=${config.pixabayApiKey}&q=${encodeURIComponent(imageSearch)}&image_type=photo`,
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
                        console.log("Image found from Pixabay for", imageSearch, ":", imageURL);
                        setLocalStorageItem(localStorageKey, imageURL, displayErrorMessage); // Save to local storage
                        updateSlideWithImage(slide, imageURL);
                    } else {
                        console.warn("No non-blacklisted images found on Pixabay for", imageSearch);
                        updateSlideWithPlaceholder(slide, "No suitable image found");
                    }
                } else {
                    console.warn("No images found on Pixabay for", imageSearch);
                    updateSlideWithPlaceholder(slide, "No image found");
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log("Image fetch aborted for", imageSearch);
                } else {
                    console.error("Error fetching image for", imageSearch, ":", error);
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
            let parsed = splitLine(line);
            if (null === parsed) {
                return null;
            }
            const englishWord = parsed.englishPhrase;
            const prefix = parsed.genderPrefix;
            const frenchWord = parsed.frenchPhrase;
            let genderClass = '';

            if (["le", "un", "les(m)"].includes(prefix)) {
                genderClass = 'masculine';
            } else if (["la", "une", "les(f)"].includes(prefix)) {
                genderClass = 'feminine';
            }

            const isPlural = (["les(m)", "les(f)"].includes(prefix));

            let definiteArticle = prefix;
            if (definiteArticle === "un") {
                definiteArticle = "le";
            } else if (definiteArticle === "une") {
                definiteArticle = "la";
            }

            const startsWithVowelOrH = /^[aeiouh]/i.test(frenchWord);

            if (!isPlural && startsWithVowelOrH && (definiteArticle === "le" || definiteArticle === "la")) {
                definiteArticle = "l'"; // Contract the article
            } else {
                definiteArticle = `${definiteArticle} `; // add a space
            }

            const prfxYour = (genderClass === 'masculine') ? "ton" : "ta";
            const prfxMy = (genderClass === 'masculine') ? "mon" : "ma";
            const wordWithDefiniteArticle = definiteArticle + frenchWord;
            const prfxOne = (genderClass === 'masculine') ? "un" : "une";
            const prfxThis = (genderClass === "masculine")
                ? (startsWithVowelOrH ? "cet" : "ce")
                : "cette";
            const prfxSome = (genderClass === "masculine")
                ? "du "
                : (startsWithVowelOrH ? "de l'" : "de la ")

            const guessable = isGuessable(frenchWord, prefix);


            // Check for closeness


            // Image Handling - Store English word for later loading
            const slideContent = generateSlideContent(genderClass, englishWord, isPlural, prfxOne, wordWithDefiniteArticle, prfxYour, prfxMy, prfxThis, prfxSome, frenchWord, guessable); // No image URL initially

            const slide = $(`<div class="slide ${genderClass}" data-english-word="${englishWord}">${slideContent}</div>`);

            // Initialize AbortController early
            slide.data('abortController', new AbortController());

            return slide;
        }

        function isClose(englishWord, frenchWord) {
            const distance = levenshteinDistance(englishWord, frenchWord);
            return distance <= config.closenessThreshold;
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
            dom.title.hide();
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

            // Load image when slide becomes active, but only if the english word is revealed
            const englishWordSpan = currentSlide.find(".english-word");

            if (englishWordSpan.hasClass("revealed")) {
                loadImageForSlide(currentSlide);
            } else {
                updateSlideWithPlaceholder(currentSlide, "?");
            }

            // Check if auto-play is enabled and read out all French words
            if ($("#auto-play-checkbox").is(":checked")) {
                autoPlaySlide(currentSlide);
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

        // Speak Button Click
        dom.slideshowContainer.on("click", ".speak-button", function () {
            const text = $(this).data("text");
            const gender = $(this).data("gender");
            speak(text, gender);
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
            removeLocalStorageItem(config.localStorageKey, displayErrorMessage);
        });

        // Save word list to local storage when the textarea changes
        dom.wordListTextarea.on('input', function () {
            setLocalStorageItem(config.localStorageKey, dom.wordListTextarea.val(), displayErrorMessage);
        });

        // Event delegation for dynamically added "Delete Image" buttons
        dom.slideshowContainer.on("click", ".delete-image-button", function () {
            const frenchWord = $(this).data("frenchword");
            const imageURL = getLocalStorageItem(frenchWord, displayErrorMessage); // Get URL before deleting

            if (frenchWord) {
                // Remove from local storage
                removeLocalStorageItem(frenchWord, displayErrorMessage);

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
        dom.slideshowContainer.on("click", ".question-marks, .image-placeholder", function () {
            const $this = $(this);
            const slide = $this.closest(".slide");
            const englishWord = slide.find(".english-word");
            const questionMarks = slide.find(".question-marks");

            // Hide the question marks and show the real word
            questionMarks.addClass("hidden");
            englishWord.addClass("revealed");

            // Load the image if the English word is revealed
            if (slide.hasClass("active")) {
                loadImageForSlide(slide);
            }
        });

        // Handle voice picker changes
        dom.maleVoiceSelect.change(function () {
            const selectedVoiceName = $(this).val();
            maleVoice = voices.find(voice => voice.name === selectedVoiceName);
            if (femaleVoice === null) {
                console.error('Failed finding female voice', {selectedVoiceName: selectedVoiceName, voices: voices});
                return;
            }
            console.log({maleVoice: maleVoice})
            localConfig.data.maleVoice = maleVoice;
            localConfig.save();
            playVoiceSample(maleVoice, 'masculine');
        });

        dom.femaleVoiceSelect.change(function () {
            const selectedVoiceName = $(this).val();
            femaleVoice = voices.find(voice => voice.name === selectedVoiceName);
            if (femaleVoice === null) {
                console.error('Failed finding female voice', {selectedVoiceName: selectedVoiceName, voices: voices});
                return;
            }
            console.log({femaleVoice: femaleVoice})
            localConfig.data.femaleVoice = femaleVoice;
            localConfig.save();
            playVoiceSample(femaleVoice, 'feminine');
        });

        // Handle play button clicks
        dom.maleVoicePlay.click(function () {
            playVoiceSample(maleVoice, 'masculine');
        });

        dom.femaleVoicePlay.click(function () {
            playVoiceSample(femaleVoice, 'feminine');
        });


        // ------------------------------------------------------------------------
        // Initialization
        // ------------------------------------------------------------------------

        // Load the configuration on page load
        localConfig.load();

        // Populate the list selector
        config.availableLists.forEach(filename => {
            dom.listSelector.append($("<option>").val(filename).text(filename));
        });

        // Load list on button click
        dom.loadListButton.click(function () {
            const selectedFile = dom.listSelector.val();
            loadListFromFile("./lists/" + selectedFile, dom.wordListTextarea, config.localStorageKey, displayErrorMessage);
        });

        // Load word list from local storage on page load
        if (getLocalStorageItem(config.localStorageKey)) {
            dom.wordListTextarea.val(getLocalStorageItem(config.localStorageKey));
        }

        // populate the voice pickers
        populateVoicePickers(voices);
    });

})(); // End of IIFE