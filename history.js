// HistoryGrep v2.0 - Fixed regex validation and CSP compliance
class HistoryGrep {
    constructor() {
        this.titleRegexInput = document.getElementById('titleRegexInput');
        this.urlRegexInput = document.getElementById('urlRegexInput');
        this.titleRegexError = document.getElementById('titleRegexError');
        this.urlRegexError = document.getElementById('urlRegexError');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.resultsInfo = document.getElementById('resultsInfo');
        this.resultsCount = document.getElementById('resultsCount');
        this.loading = document.getElementById('loading');
        this.noResults = document.getElementById('noResults');
        this.pagination = document.getElementById('pagination');
        this.customDateRange = document.getElementById('customDateRange');
        this.startDate = document.getElementById('startDate');
        this.excludeOpenTabs = document.getElementById('excludeOpenTabs');
        this.closeAllTabsBtn = document.getElementById('closeAllTabs');
        this.consolidateTabsBtn = document.getElementById('consolidateTabs');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');
        this.closeTabsExcludeList = document.getElementById('closeTabsExcludeList');
        this.searchResultsExcludeList = document.getElementById('searchResultsExcludeList');

        this.currentResults = [];
        this.displayedResults = [];
        this.currentPage = 1;
        this.resultsPerPage = 50;
        this.selectedPeriod = '3';
        this.selectedSort = 'lastVisit';
        this.searchTimeout = null;
        this.openTabUrls = new Set();
        this.settings = {
            closeTabsExcludePatterns: [],
            searchResultsExcludePatterns: []
        };

        this.initializeEventListeners();
        this.initializeDateInputs();
        this.loadSettings().then(() => {
            this.performSearch();
            // Auto-focus the title search input for keyboard accessibility
            this.titleRegexInput.focus();
        });
    }

    initializeEventListeners() {
        // Title regex input with debouncing and validation
        this.titleRegexInput.addEventListener('input', () => {
            this.validateRegex(this.titleRegexInput, this.titleRegexError);
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });

        // URL regex input with debouncing and validation
        this.urlRegexInput.addEventListener('input', () => {
            this.validateRegex(this.urlRegexInput, this.urlRegexError);
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });


        // Date filter buttons
        document.querySelectorAll('.date-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedPeriod = e.target.dataset.period;

                if (this.selectedPeriod === 'custom') {
                    this.customDateRange.classList.add('active');
                } else {
                    this.customDateRange.classList.remove('active');
                }

                this.performSearch();
            });
        });

        // Custom date range input
        this.startDate.addEventListener('change', () => {
            if (this.selectedPeriod === 'custom') {
                this.performSearch();
            }
        });

        // Sort filter buttons
        document.querySelectorAll('.sort-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sort-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedSort = e.target.dataset.sort;
                this.performSearch();
            });
        });

        // Exclude open tabs checkbox
        this.excludeOpenTabs.addEventListener('change', () => {
            this.performSearch();
        });

        // Close all tabs button
        this.closeAllTabsBtn.addEventListener('click', () => {
            this.closeAllUnpinnedTabs();
        });

        // Consolidate tabs button
        this.consolidateTabsBtn.addEventListener('click', () => {
            this.consolidateTabsToCurrentWindow();
        });

        // Settings button
        this.settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });

        // Close settings button
        this.closeSettingsBtn.addEventListener('click', () => {
            this.closeSettings();
        });

        // Save settings button
        this.saveSettingsBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Click outside modal to close
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.closeSettings();
            }
        });

        // Add pattern buttons
        document.querySelectorAll('.add-pattern-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetList = e.target.getAttribute('data-target');
                this.addPatternToList(targetList);
            });
        });

        // Handle result clicks for tab switching and copy URL
        this.resultsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('result-title')) {
                e.preventDefault();
                const url = e.target.getAttribute('data-url');
                await this.switchToTabOrOpen(url);
            } else if (e.target.closest('.copy-url-btn')) {
                e.preventDefault();
                const url = e.target.closest('.copy-url-btn').getAttribute('data-url');
                await this.copyToClipboard(url);
            }
        });

        // Handle pagination clicks
        this.pagination.addEventListener('click', (e) => {
            if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page > 0) {
                    this.goToPage(page);
                }
            }
        });

        // Handle favicon image errors
        this.resultsContainer.addEventListener('error', (e) => {
            if (e.target.classList.contains('result-favicon')) {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="%23ccc"/></svg>';
            }
        }, true);
    }

    validateRegex(inputElement, errorElement) {
        const pattern = inputElement.value.trim();

        // Clear previous error state
        inputElement.classList.remove('error');
        errorElement.textContent = '';

        // Empty pattern is valid (matches everything)
        if (!pattern) {
            return true;
        }

        try {
            new RegExp(pattern, 'i');
            return true;
        } catch (error) {
            inputElement.classList.add('error');
            errorElement.textContent = `Invalid regex: ${error.message}`;
            return false;
        }
    }

    async switchToTabOrOpen(url) {
        try {
            // Query for existing tabs with this URL
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({ url: url }, resolve);
            });

            if (tabs.length > 0) {
                // Switch to the first existing tab
                const existingTab = tabs[0];
                await chrome.tabs.update(existingTab.id, { active: true });
                await chrome.windows.update(existingTab.windowId, { focused: true });
            } else {
                // Open in new tab
                chrome.tabs.create({ url: url, active: true });
            }
        } catch (error) {
            console.error('Error switching to tab:', error);
            // Fallback to opening in new tab
            chrome.tabs.create({ url: url, active: true });
        }
    }

    initializeDateInputs() {
        const today = new Date();
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        this.startDate.value = threeDaysAgo.toISOString().split('T')[0];
    }

    getDateRange() {
        const now = Date.now();
        let startTime, endTime = now;

        if (this.selectedPeriod === 'custom') {
            if (this.startDate.value) {
                startTime = new Date(this.startDate.value).getTime();
            } else {
                startTime = now - (3 * 24 * 60 * 60 * 1000); // Default to last 3 days
            }
        } else if (this.selectedPeriod === 'all') {
            startTime = 0;
        } else {
            const days = parseInt(this.selectedPeriod);
            startTime = now - (days * 24 * 60 * 60 * 1000);
        }

        return { startTime, endTime };
    }

    async performSearch() {
        this.showLoading();

        const titlePattern = this.titleRegexInput.value.trim();
        const urlPattern = this.urlRegexInput.value.trim();
        const { startTime, endTime } = this.getDateRange();

        // Skip search if both patterns have invalid regex
        if (!this.validateRegex(this.titleRegexInput, this.titleRegexError) ||
            !this.validateRegex(this.urlRegexInput, this.urlRegexError)) {
            this.showNoResults();
            return;
        }

        try {
            // Get open tabs if excluding them
            if (this.excludeOpenTabs.checked) {
                await this.updateOpenTabUrls();
            }

            // Get all history items in the date range
            const historyItems = await new Promise((resolve) => {
                chrome.history.search({
                    text: '', // Empty to get all items
                    startTime: startTime,
                    endTime: endTime,
                    maxResults: 10000
                }, resolve);
            });

            // Apply dual regex filtering
            let filteredItems = this.dualRegexFilter(historyItems, titlePattern, urlPattern);

            // Exclude open tabs if option is checked
            if (this.excludeOpenTabs.checked) {
                filteredItems = filteredItems.filter(item => !this.openTabUrls.has(item.url));
            }

            // Apply search results exclude patterns
            if (this.settings.searchResultsExcludePatterns.length > 0) {
                filteredItems = filteredItems.filter(item => {
                    return !this.matchesAnyPattern(item.url, this.settings.searchResultsExcludePatterns);
                });
            }

            // Calculate scores for filtered items
            const scoredItems = await this.calculateScores(filteredItems, startTime, endTime);

            this.currentResults = scoredItems;
            this.displayResults();

        } catch (error) {
            console.error('Search error:', error);
            this.showNoResults();
        }
    }

    dualRegexFilter(items, titlePattern, urlPattern) {
        return items.filter(item => {
            const title = item.title || '';
            const url = item.url || '';

            let titleMatch = true;
            let urlMatch = true;

            // Test title pattern if provided
            if (titlePattern) {
                try {
                    const titleRegex = new RegExp(titlePattern, 'i');
                    titleMatch = titleRegex.test(title);
                } catch (error) {
                    titleMatch = false;
                }
            }

            // Test URL pattern if provided
            if (urlPattern) {
                try {
                    const urlRegex = new RegExp(urlPattern, 'i');
                    urlMatch = urlRegex.test(url);
                } catch (error) {
                    urlMatch = false;
                }
            }

            return titleMatch && urlMatch;
        });
    }

    async calculateScores(items, startTime, endTime) {
        // Get visit details for all items in parallel
        const visitPromises = items.map(async (item) => {
            return new Promise((resolve) => {
                chrome.history.getVisits({ url: item.url }, (visits) => {
                    // Filter visits to the selected time range
                    const rangeVisits = visits.filter(visit =>
                        visit.visitTime >= startTime && visit.visitTime <= endTime
                    );

                    // Find the most recent visit in range
                    const mostRecentVisit = rangeVisits.reduce((latest, visit) => {
                        return visit.visitTime > latest.visitTime ? visit : latest;
                    }, { visitTime: 0 });

                    item.lastVisitInRange = mostRecentVisit.visitTime;
                    item.visitCountInRange = rangeVisits.length;
                    resolve(item);
                });
            });
        });

        const scoredItems = await Promise.all(visitPromises);

        // Sort based on selected sort option
        if (this.selectedSort === 'lastVisit') {
            return scoredItems.sort((a, b) => b.lastVisitInRange - a.lastVisitInRange);
        } else { // visitsInRange
            return scoredItems.sort((a, b) => {
                // First by visit count in range, then by most recent visit as tiebreaker
                if (b.visitCountInRange !== a.visitCountInRange) {
                    return b.visitCountInRange - a.visitCountInRange;
                }
                return b.lastVisitInRange - a.lastVisitInRange;
            });
        }
    }

    highlightRegexMatches(text, pattern) {
        if (!pattern || !text) {
            return this.escapeHtml(text);
        }

        // Validate regex pattern before using it
        if (!this.isValidRegex(pattern)) {
            return this.escapeHtml(text);
        }

        try {
            const regex = new RegExp(pattern, 'gi');
            const escapedText = this.escapeHtml(text);
            return escapedText.replace(regex, '<mark>$&</mark>');
        } catch (error) {
            return this.escapeHtml(text);
        }
    }

    isValidRegex(pattern) {
        try {
            new RegExp(pattern);
            return true;
        } catch (error) {
            return false;
        }
    }




    displayResults() {
        this.hideLoading();

        this.displayedResults = this.currentResults;
        this.currentPage = 1;

        if (this.displayedResults.length === 0) {
            this.showNoResults();
            return;
        }

        this.showResults();
        this.updateResultsInfo();

        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = startIndex + this.resultsPerPage;
        const pageResults = this.displayedResults.slice(startIndex, endIndex);

        this.resultsContainer.innerHTML = pageResults.map(item => this.createResultHTML(item)).join('');
        this.updatePagination();
    }

    createResultHTML(item) {
        const title = item.title || 'Untitled';
        const url = item.url;
        const lastVisitInRange = new Date(item.lastVisitInRange).toLocaleString();
        const visitCountInRange = item.visitCountInRange;

        // Extract domain for favicon using Google's service
        let faviconUrl = '';
        try {
            faviconUrl = `https://www.google.com/s2/favicons?sz=16&domain_url=${encodeURIComponent(url)}`;
        } catch (e) {
            faviconUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="%23ccc"/></svg>';
        }

        // Highlight regex matches in title and URL
        const titlePattern = this.titleRegexInput.value.trim();
        const urlPattern = this.urlRegexInput.value.trim();
        const highlightedTitle = this.highlightRegexMatches(title, titlePattern);
        const highlightedUrl = this.highlightRegexMatches(url, urlPattern);

        let metaItems = [
            `<span class="result-meta-item">Last visited: ${lastVisitInRange}</span>`
        ];

        if (visitCountInRange !== undefined) {
            metaItems.push(`<span class="result-meta-item">Visits in period: ${visitCountInRange}</span>`);
        }

        return `
            <div class="result-item">
                <img src="${faviconUrl}"
                     class="result-favicon"
                     alt="Site icon">
                <div class="result-content">
                    <div class="result-title-line">
                        <a href="${url}" class="result-title" data-url="${url}">${highlightedTitle}</a>
                    </div>
                    <div class="result-meta-line">
                        <span class="result-url">${highlightedUrl}</span>
                        <button class="copy-url-btn" data-url="${url}" title="Copy URL">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <span class="result-meta">${metaItems.join(' • ')}</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateResultsInfo() {
        const total = this.displayedResults.length;
        const startIndex = (this.currentPage - 1) * this.resultsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.resultsPerPage, total);

        this.resultsCount.textContent = `Showing ${startIndex}-${endIndex} of ${total} results`;
    }

    updatePagination() {
        const totalPages = Math.ceil(this.displayedResults.length / this.resultsPerPage);

        if (totalPages <= 1) {
            this.pagination.style.display = 'none';
            return;
        }

        this.pagination.style.display = 'flex';

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}" class="pagination-btn">
                Previous
            </button>
        `;

        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="${i === this.currentPage ? 'active' : ''} pagination-btn" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}" class="pagination-btn">
                Next
            </button>
        `;

        this.pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.displayResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.resultsContainer.style.display = 'none';
        this.resultsInfo.style.display = 'none';
        this.noResults.style.display = 'none';
        this.pagination.style.display = 'none';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showResults() {
        this.resultsContainer.style.display = 'block';
        this.resultsInfo.style.display = 'flex';
        this.noResults.style.display = 'none';
    }

    showNoResults() {
        this.resultsContainer.style.display = 'none';
        this.resultsInfo.style.display = 'none';
        this.noResults.style.display = 'block';
        this.pagination.style.display = 'none';
    }

    async updateOpenTabUrls() {
        try {
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({}, resolve);
            });
            this.openTabUrls = new Set(tabs.map(tab => tab.url));
        } catch (error) {
            console.error('Error getting open tabs:', error);
            this.openTabUrls = new Set();
        }
    }

    async closeAllUnpinnedTabs() {
        try {
            const windows = await new Promise((resolve) => {
                chrome.windows.getAll({ populate: true }, resolve);
            });

            const tabsToClose = [];
            windows.forEach(window => {
                window.tabs.forEach(tab => {
                    // Exclude pinned tabs, grouped tabs, and tabs matching exclusion patterns
                    if (!tab.pinned &&
                        tab.groupId === -1 &&
                        !this.matchesAnyPattern(tab.url, this.settings.closeTabsExcludePatterns)) {
                        tabsToClose.push(tab.id);
                    }
                });
            });

            if (tabsToClose.length > 0) {
                await new Promise((resolve) => {
                    chrome.tabs.remove(tabsToClose, resolve);
                });

                // Update open tabs list after closing
                await this.updateOpenTabUrls();

                // Refresh search if excluding open tabs
                if (this.excludeOpenTabs.checked) {
                    this.performSearch();
                }
            }
        } catch (error) {
            console.error('Error closing tabs:', error);
        }
    }

    async consolidateTabsToCurrentWindow() {
        try {
            // Get the current window (where the user clicked the button)
            const currentWindow = await new Promise((resolve) => {
                chrome.windows.getCurrent({ populate: true }, resolve);
            });

            // Get all windows with their tabs
            const allWindows = await new Promise((resolve) => {
                chrome.windows.getAll({ populate: true }, resolve);
            });

            // Find all tabs from other windows that aren't pinned
            const tabsToMove = [];
            allWindows.forEach(window => {
                // Skip the current window
                if (window.id === currentWindow.id) {
                    return;
                }

                window.tabs.forEach(tab => {
                    // Only move unpinned tabs (to preserve pinned tabs in their original window)
                    if (!tab.pinned) {
                        tabsToMove.push(tab.id);
                    }
                });
            });

            // Move all collected tabs to the current window
            if (tabsToMove.length > 0) {
                await new Promise((resolve) => {
                    chrome.tabs.move(tabsToMove, {
                        windowId: currentWindow.id,
                        index: -1  // Move to the end
                    }, resolve);
                });

                // Update open tabs list after moving
                await this.updateOpenTabUrls();

                // Show feedback to user
                console.log(`Consolidated ${tabsToMove.length} tabs to current window`);
            } else {
                console.log('No tabs to consolidate - all tabs are already in the current window or are pinned');
            }

        } catch (error) {
            console.error('Error consolidating tabs:', error);
        }
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            // Visual feedback
            this.showToast('URL copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('URL copied to clipboard!');
        }
    }

    showToast(message) {
        // Create and show a temporary toast notification
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    }

    matchesAnyPattern(url, patterns) {
        return patterns.some(pattern => {
            try {
                const regex = new RegExp(pattern, 'i');
                return regex.test(url);
            } catch (error) {
                console.warn('Invalid pattern:', pattern, error);
                return false;
            }
        });
    }

    async loadSettings() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.sync.get({
                    closeTabsExcludePatterns: [],
                    searchResultsExcludePatterns: []
                }, resolve);
            });
            this.settings = result;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettingsToStorage() {
        try {
            await new Promise((resolve) => {
                chrome.storage.sync.set(this.settings, resolve);
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    openSettings() {
        this.populateSettingsUI();
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    populateSettingsUI() {
        this.populatePatternList('closeTabsExcludeList', this.settings.closeTabsExcludePatterns);
        this.populatePatternList('searchResultsExcludeList', this.settings.searchResultsExcludePatterns);
    }

    populatePatternList(listId, patterns) {
        const list = document.getElementById(listId);
        list.innerHTML = '';

        patterns.forEach((pattern, index) => {
            this.addPatternToList(listId, pattern, index);
        });

        // Always add one empty row for new entries
        if (patterns.length === 0) {
            this.addPatternToList(listId, '', 0);
        }
    }

    addPatternToList(listId, pattern = '', index = null) {
        const list = document.getElementById(listId);
        const patternItem = document.createElement('div');
        patternItem.className = 'pattern-item';

        if (index === null) {
            index = list.children.length;
        }

        patternItem.innerHTML = `
            <input type="text" class="pattern-input" value="${pattern}" placeholder="e.g. github\.com|important-site\.com" data-index="${index}">
            <button class="remove-pattern-btn" data-index="${index}">Remove</button>
        `;

        // Add event listeners
        const removeBtn = patternItem.querySelector('.remove-pattern-btn');
        removeBtn.addEventListener('click', () => {
            patternItem.remove();
        });

        list.appendChild(patternItem);
    }

    saveSettings() {
        // Collect patterns from UI
        this.settings.closeTabsExcludePatterns = this.collectPatternsFromList('closeTabsExcludeList');
        this.settings.searchResultsExcludePatterns = this.collectPatternsFromList('searchResultsExcludeList');

        // Save to storage
        this.saveSettingsToStorage();

        // Close modal and refresh search
        this.closeSettings();
        this.performSearch();

        this.showToast('Settings saved!');
    }

    collectPatternsFromList(listId) {
        const list = document.getElementById(listId);
        const inputs = list.querySelectorAll('.pattern-input');
        const patterns = [];

        inputs.forEach(input => {
            const pattern = input.value.trim();
            if (pattern) {
                patterns.push(pattern);
            }
        });

        return patterns;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application - v2.0
let historySearch;
document.addEventListener('DOMContentLoaded', function() {
    console.log('HistoryGrep v2.0 - Initializing...');
    historySearch = new HistoryGrep();
});