document.addEventListener('DOMContentLoaded', function() {
    const openHistoryButton = document.getElementById('openHistorySearch');

    openHistoryButton.addEventListener('click', function() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('history.html')
        });

        // Close the popup after opening the history page
        window.close();
    });
});