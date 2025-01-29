// accents/code.js
import {loadListFromFile} from '../lib/words.js';
import {shuffleArray} from '../lib/arrays.js'

const config = {
    availableLists: ['common.txt'], // Add your list files here
    localStorageKey: 'frenchAccentWords'
};

const dom = {
    listSelector: $('#list-selector'),
    loadListButton: $('#load-list-button'),
    wordListTextarea: $('#word-list'),
    generateButton: $('#generate-button'),
    prevButton: $('#prev-button'),
    nextButton: $('#next-button'),
    submitButton: $('#submit-button'),
    slideshowContainer: $('#slideshow-container'),
    accentOptions: $('#accent-options'),
    accentPopup: $('#accent-popup'),
    closePopup: $('#close-popup'),
    errorMessage: $('#error-message')
};

/**
 * Get accented variants of a given letter.
 * @param {string} letter - The letter to get accented variants for.
 * @returns {string[]} An array of accented variants.
 */
function getAccentedVariants(letter) {
    const accents = {
        'a': ['à', 'á', 'â', 'ä', 'ã', 'å'],
        'e': ['è', 'é', 'ê', 'ë'],
        'i': ['ì', 'í', 'î', 'ï'],
        'o': ['ò', 'ó', 'ô', 'ö', 'õ'],
        'u': ['ù', 'ú', 'û', 'ü'],
        'c': ['ç'],
        'n': ['ñ']
    };
    return accents[letter.toLowerCase()] || [];
}

/**
 * Display an error message.
 * @param {string} message - The error message to display.
 */
function displayErrorMessage(message) {
    dom.errorMessage.text(message);
}

/**
 * Toggle the visibility of the setup elements and the slideshow.
 * @param {boolean} showSlideshow - Whether to show the slideshow or the setup elements.
 */
function toggleVisibility(showSlideshow) {
    if (showSlideshow) {
        dom.wordListTextarea.hide();
        dom.generateButton.hide();
        dom.loadListButton.hide();
        dom.listSelector.hide();
        dom.slideshowContainer.show();
        dom.prevButton.show();
        dom.nextButton.show();
        dom.submitButton.show();
    } else {
        dom.wordListTextarea.show();
        dom.generateButton.show();
        dom.loadListButton.show();
        dom.listSelector.show();
        dom.slideshowContainer.hide();
        dom.prevButton.hide();
        dom.nextButton.hide();
        dom.submitButton.hide();
    }
}

$(document).ready(function () {
    let words = [];
    let currentSlide = 0;

    // Populate the list selector
    config.availableLists.forEach(filename => {
        dom.listSelector.append($('<option>').val(filename).text(filename));
    });

    // Load list on button click
    dom.loadListButton.click(function () {
        const selectedFile = dom.listSelector.val();
        loadListFromFile("./lists/" + selectedFile, dom.wordListTextarea, config.localStorageKey, displayErrorMessage);
    });

    // Load word list from local storage on page load
    if (localStorage.getItem(config.localStorageKey)) {
        dom.wordListTextarea.val(localStorage.getItem(config.localStorageKey));
    }

    dom.generateButton.click(function () {
        const wordList = dom.wordListTextarea.val().trim().split('\n');
        words = wordList.map(word => ({
            original: word,
            withoutAccents: word.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        }));
        shuffleArray(words);
        generateSlides();
        toggleVisibility(true);
    });

    dom.prevButton.click(function () {
        if (currentSlide > 0) {
            currentSlide--;
            showSlide(currentSlide);
        }
    });

    dom.nextButton.click(function () {
        if (currentSlide < words.length - 1) {
            currentSlide++;
            showSlide(currentSlide);
        }
    });

    dom.submitButton.click(function () {
        checkCurrentAnswer();
    });

    /**
     * Check the user's answer for the current slide.
     */
    function checkCurrentAnswer() {
        const currentSlideElement = dom.slideshowContainer.find(`.slide[data-index=${currentSlide}]`);
        currentSlideElement.find('.result-message').remove(); // Remove any existing result message

        const word = words[currentSlide];
        const userAnswer = currentSlideElement.find('.letter').map(function () {
            return $(this).text();
        }).get().join('');

        const resultMessage = $('<div class="result-message"></div>');
        const correctVersion = $('<div><span>Correct:</span><span>' + word.original + '</span></div>');
        const yourVersion = $('<div><span>Your Version:</span><span>' + userAnswer + '</span></div>');

        resultMessage.append(correctVersion);
        resultMessage.append(yourVersion);

        if (userAnswer === word.original) {
            resultMessage.css('color', 'green');
        } else {
            resultMessage.css('color', 'red');
        }

        currentSlideElement.append(resultMessage);
    }

    /**
     * Generate slides for the word list.
     */
    function generateSlides() {
        dom.slideshowContainer.empty();
        words.forEach((word, index) => {
            const slide = $('<div class="slide"></div>');
            word.withoutAccents.split('').forEach(letter => {
                slide.append(`<span class="letter">${letter}</span>`);
            });
            slide.attr('data-index', index);
            dom.slideshowContainer.append(slide);
        });
        showSlide(0);
    }

    /**
     * Show the slide at the given index.
     * @param {number} index - The index of the slide to show.
     */
    function showSlide(index) {
        dom.slideshowContainer.find('.slide').removeClass('active-slide');
        dom.slideshowContainer.find(`.slide[data-index=${index}]`).addClass('active-slide');
    }

    // Event handler for clicking on a letter
    dom.slideshowContainer.on('click', '.letter', function () {
        const letter = $(this).text();
        const variants = getAccentedVariants(letter);
        if (variants.length > 0) {
            const offset = $(this).offset();
            dom.accentOptions.empty();
            variants.forEach(variant => {
                dom.accentOptions.append(`<button class="accent-option btn btn-secondary">${variant}</button>`);
            });
            dom.accentPopup.css({
                top: offset.top + $(this).height(),
                left: offset.left
            }).show();
            dom.accentPopup.data('target', $(this));
        }
    });

    // Event handler for selecting an accented variant
    dom.accentOptions.on('click', '.accent-option', function () {
        const selectedAccent = $(this).text();
        const target = dom.accentPopup.data('target');
        target.text(selectedAccent);
        dom.accentPopup.hide();
    });

    // Event handler for closing the popup
    dom.closePopup.click(function () {
        dom.accentPopup.hide();
    });
});