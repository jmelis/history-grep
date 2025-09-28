class HistorySearchPro {
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
        this.endDate = document.getElementById('endDate');

        this.currentResults = [];
        this.displayedResults = [];
        this.currentPage = 1;
        this.resultsPerPage = 50;
        this.selectedPeriod = '1';
        this.searchTimeout = null;

        this.initializeEventListeners();
        this.initializeDateInputs();
        this.performSearch();
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

        // Custom date range inputs
        this.startDate.addEventListener('change', () => {
            if (this.selectedPeriod === 'custom') {
                this.performSearch();
            }
        });

        this.endDate.addEventListener('change', () => {
            if (this.selectedPeriod === 'custom') {
                this.performSearch();
            }
        });

        // Handle result clicks for tab switching
        this.resultsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('result-title')) {
                e.preventDefault();
                const url = e.target.getAttribute('data-url');
                await this.switchToTabOrOpen(url);
            }
        });
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
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        this.endDate.value = today.toISOString().split('T')[0];
        this.startDate.value = yesterday.toISOString().split('T')[0];
    }

    getDateRange() {
        const now = Date.now();
        let startTime, endTime;

        if (this.selectedPeriod === 'custom') {
            if (this.startDate.value && this.endDate.value) {
                startTime = new Date(this.startDate.value).getTime();
                endTime = new Date(this.endDate.value).getTime() + (24 * 60 * 60 * 1000) - 1;
            } else {
                startTime = now - (24 * 60 * 60 * 1000); // Default to last day
                endTime = now;
            }
        } else if (this.selectedPeriod === 'all') {
            startTime = 0;
            endTime = now;
        } else {
            const days = parseInt(this.selectedPeriod);
            startTime = now - (days * 24 * 60 * 60 * 1000);
            endTime = now;
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
            const filteredItems = this.dualRegexFilter(historyItems, titlePattern, urlPattern);

            // Calculate time-decay weighted scores for filtered items
            const scoredItems = await this.calculateTimeDecayScores(filteredItems, startTime, endTime);

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

    async calculateTimeDecayScores(items, startTime, endTime) {
        const timeRange = endTime - startTime;

        // Get visit details for all items in parallel
        const visitPromises = items.map(async (item) => {
            return new Promise((resolve) => {
                chrome.history.getVisits({ url: item.url }, (visits) => {
                    // Filter visits to the selected time range
                    const rangeVisits = visits.filter(visit =>
                        visit.visitTime >= startTime && visit.visitTime <= endTime
                    );

                    // Calculate time-decay weighted score
                    let score = 0;
                    rangeVisits.forEach(visit => {
                        // Calculate recency weight: 1.0 (most recent) to 0.0 (oldest)
                        const ageInRange = endTime - visit.visitTime;
                        const recencyWeight = timeRange > 0 ? 1.0 - (ageInRange / timeRange) : 1.0;
                        score += recencyWeight;
                    });

                    item.timeDecayScore = score;
                    item.visitCountInRange = rangeVisits.length;
                    resolve(item);
                });
            });
        });

        const scoredItems = await Promise.all(visitPromises);

        // Sort by time-decay score descending
        return scoredItems.sort((a, b) => b.timeDecayScore - a.timeDecayScore);
    }

    highlightRegexMatches(text, pattern) {
        if (!pattern || !text) {
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
        const lastVisit = new Date(item.lastVisitTime).toLocaleString();
        const visitCount = item.visitCount;
        const timeDecayScore = item.timeDecayScore;
        const visitCountInRange = item.visitCountInRange;

        // Extract domain for favicon
        let faviconUrl = '';
        try {
            const urlObj = new URL(url);
            faviconUrl = `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
        } catch (e) {
            faviconUrl = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="%23ccc"/></svg>';
        }

        // Highlight regex matches in title and URL
        const titlePattern = this.titleRegexInput.value.trim();
        const urlPattern = this.urlRegexInput.value.trim();
        const highlightedTitle = this.highlightRegexMatches(title, titlePattern);
        const highlightedUrl = this.highlightRegexMatches(url, urlPattern);

        let metaItems = [
            `<span class="result-meta-item">Last visited: ${lastVisit}</span>`,
            `<span class="result-meta-item">Total visits: ${visitCount}</span>`
        ];

        if (visitCountInRange !== undefined) {
            metaItems.push(`<span class="result-meta-item">Visits in range: ${visitCountInRange}</span>`);
        }

        if (timeDecayScore !== undefined) {
            metaItems.unshift(`<span class="result-meta-item"><span class="relevance-score">Score: ${timeDecayScore.toFixed(2)}</span></span>`);
        }

        return `
            <div class="result-item">
                <img src="${faviconUrl}"
                     class="result-favicon"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 16 16&quot;><circle cx=&quot;8&quot; cy=&quot;8&quot; r=&quot;6&quot; fill=&quot;%23ccc&quot;/></svg>'"
                     alt="Site icon">
                <div class="result-content">
                    <div class="result-title-line">
                        <a href="${url}" class="result-title" data-url="${url}">${highlightedTitle}</a>
                    </div>
                    <div class="result-meta-line">
                        <span class="result-url">${highlightedUrl}</span>
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
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="historySearch.goToPage(${this.currentPage - 1})">
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
                <button class="${i === this.currentPage ? 'active' : ''}" onclick="historySearch.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="historySearch.goToPage(${this.currentPage + 1})">
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application
let historySearch;
document.addEventListener('DOMContentLoaded', function() {
    historySearch = new HistorySearchPro();
});