/**
 *
 * @param {string} frenchWord
 * @returns {string}
 */
export function generateWordLinkButtons(frenchWord) {
    // Construct the URLs
    const googleTranslateURL = `https://translate.google.co.uk/?sl=fr&tl=en&text=${encodeURIComponent(frenchWord)}&op=translate}`;
    const wordReferenceURL = `https://www.wordreference.com/fren/${encodeURIComponent(frenchWord)}`;
    const forvoURL = `https://forvo.com/word/${encodeURIComponent(frenchWord)}/#fr`;
    const lingueeURL = `https://www.linguee.com/french-english/search?source=auto&query=${encodeURIComponent(frenchWord)}`;
    return `
    <div class="word-buttons">
        <a href="${googleTranslateURL}" target="_blank">Google Translate</a>
        <a href="${wordReferenceURL}" target="_blank">WordReference</a>
        <a href="${forvoURL}" target="_blank">Pronunciation (Forvo)</a>
        <a href="${lingueeURL}" target="_blank">Linguee</a>
    </div>
    `
}