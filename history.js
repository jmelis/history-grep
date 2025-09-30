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

        this.currentResults = [];
        this.displayedResults = [];
        this.currentPage = 1;
        this.resultsPerPage = 50;
        this.selectedPeriod = '3';
        this.selectedSort = 'lastVisit';
        this.searchTimeout = null;
        this.openTabUrls = new Set();
        this.settings = {
            searchResultsExcludePatterns: [],
            urlGroupingRules: [
                {
                    pattern: "docs\\.google\\.com",
                    groupBy: "fragment",
                    description: "Google Docs - group by document"
                },
                {
                    pattern: "github\\.com/.+/issues",
                    groupBy: "fragment",
                    description: "GitHub Issues - group by issue page"
                },
                {
                    pattern: "stackoverflow\\.com/questions",
                    groupBy: "fragment",
                    description: "Stack Overflow - group by question"
                },
                {
                    pattern: ".*",
                    groupBy: "none",
                    description: "Default - no grouping"
                }
            ]
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
            } else if (e.target.closest('.group-toggle-btn')) {
                e.preventDefault();
                this.toggleGroupedUrls(e.target.closest('.group-toggle-btn'));
            } else if (e.target.classList.contains('grouped-url-link')) {
                e.preventDefault();
                const url = e.target.getAttribute('href');
                await this.switchToTabOrOpen(url);
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

            // Group results by title and URL base (without fragment)
            const groupedResults = this.groupResults(scoredItems);

            this.currentResults = groupedResults;
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

    applyGroupingRules(url) {
        // Safety check: ensure urlGroupingRules exists
        if (!this.settings.urlGroupingRules || !Array.isArray(this.settings.urlGroupingRules)) {
            return url; // No grouping if rules are not available
        }

        // Check each grouping rule in order (first match wins)
        for (const rule of this.settings.urlGroupingRules) {
            try {
                const regex = new RegExp(rule.pattern, 'i');
                if (regex.test(url)) {
                    return this.processUrlByGroupType(url, rule.groupBy);
                }
            } catch (error) {
                // Invalid regex pattern, skip this rule
                console.warn('Invalid grouping rule pattern:', rule.pattern, error);
                continue;
            }
        }

        // If no rules match, return original URL (no grouping)
        return url;
    }

    processUrlByGroupType(url, groupType) {
        try {
            const urlObj = new URL(url);

            switch (groupType) {
                case 'fragment':
                    // Remove fragment (everything after #)
                    return url.split('#')[0];

                case 'query':
                    // Remove query parameters (everything after ?)
                    return url.split('?')[0];

                case 'query_and_fragment':
                case 'query-and-fragment':
                    // Remove both query parameters and fragment
                    return url.split('?')[0].split('#')[0];

                case 'path-segment':
                    // Remove last path segment
                    const pathParts = urlObj.pathname.split('/').filter(part => part);
                    if (pathParts.length > 0) {
                        pathParts.pop(); // Remove last segment
                        urlObj.pathname = '/' + pathParts.join('/');
                        return urlObj.toString();
                    }
                    return url;

                case 'subdomain':
                    // Group by main domain (remove subdomain)
                    const hostParts = urlObj.hostname.split('.');
                    if (hostParts.length > 2) {
                        const mainDomain = hostParts.slice(-2).join('.');
                        urlObj.hostname = mainDomain;
                        return urlObj.toString();
                    }
                    return url;

                case 'none':
                default:
                    // No grouping
                    return url;
            }
        } catch (error) {
            // Invalid URL, return as-is
            console.warn('Invalid URL for grouping:', url, error);
            return url;
        }
    }

    groupResults(items) {
        const groups = new Map();

        items.forEach(item => {
            // Create grouping key: title + processed URL based on rules
            const title = item.title || 'Untitled';
            const processedUrl = this.applyGroupingRules(item.url);
            const groupKey = `${title}|${processedUrl}`;

            if (groups.has(groupKey)) {
                const group = groups.get(groupKey);
                // Merge visit data
                group.visitCountInRange += item.visitCountInRange;
                group.totalVisitCount += (item.visitCount || 0);

                // Keep the most recent visit time
                if (item.lastVisitInRange > group.lastVisitInRange) {
                    group.lastVisitInRange = item.lastVisitInRange;
                    group.lastVisitTime = item.lastVisitTime;
                }

                // Add this item's URL to the grouped URLs array
                group.groupedUrls.push({
                    url: item.url,
                    visitCount: item.visitCountInRange,
                    lastVisit: item.lastVisitInRange
                });
            } else {
                // First item for this group
                const groupedItem = {
                    ...item,
                    url: processedUrl, // Use processed URL based on grouping rules
                    totalVisitCount: item.visitCount || 0,
                    groupedUrls: [{
                        url: item.url,
                        visitCount: item.visitCountInRange,
                        lastVisit: item.lastVisitInRange
                    }],
                    isGrouped: true
                };
                groups.set(groupKey, groupedItem);
            }
        });

        // Convert map to array and sort grouped results
        const groupedArray = Array.from(groups.values());

        // Sort based on selected sort option (same logic as before)
        if (this.selectedSort === 'lastVisit') {
            return groupedArray.sort((a, b) => b.lastVisitInRange - a.lastVisitInRange);
        } else { // visitsInRange
            return groupedArray.sort((a, b) => {
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

        // Add grouping information if this is a grouped result
        let groupInfo = '';
        if (item.isGrouped && item.groupedUrls && item.groupedUrls.length > 1) {
            const groupCount = item.groupedUrls.length;
            metaItems.push(`<span class="result-meta-item group-indicator">${groupCount} similar URLs grouped</span>`);

            // Create expandable list of grouped URLs
            const groupedUrlsList = item.groupedUrls
                .sort((a, b) => b.lastVisit - a.lastVisit) // Sort by most recent visit
                .map(urlItem => {
                    const urlLastVisit = new Date(urlItem.lastVisit).toLocaleString();
                    const urlHighlighted = this.highlightRegexMatches(urlItem.url, urlPattern);
                    return `
                        <div class="grouped-url-item">
                            <a href="${urlItem.url}" class="grouped-url-link">${urlHighlighted}</a>
                            <span class="grouped-url-meta">Visits: ${urlItem.visitCount} • Last: ${urlLastVisit}</span>
                        </div>
                    `;
                }).join('');

            groupInfo = `
                <div class="grouped-urls-container" style="display: none;">
                    <div class="grouped-urls-header">Similar URLs:</div>
                    <div class="grouped-urls-list">${groupedUrlsList}</div>
                </div>
            `;
        }

        return `
            <div class="result-item ${item.isGrouped && item.groupedUrls && item.groupedUrls.length > 1 ? 'grouped-result' : ''}">
                <img src="${faviconUrl}"
                     class="result-favicon"
                     alt="Site icon">
                <div class="result-content">
                    <div class="result-title-line">
                        <a href="${url}" class="result-title" data-url="${url}">${highlightedTitle}</a>
                        ${item.isGrouped && item.groupedUrls && item.groupedUrls.length > 1 ? `
                            <button class="group-toggle-btn" title="Show/hide similar URLs">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                    <path d="M7 10l5 5 5-5z"/>
                                </svg>
                            </button>
                        ` : ''}
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
                    ${groupInfo}
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
                    searchResultsExcludePatterns: [],
                    urlGroupingRules: [
                        {
                            pattern: "docs\\.google\\.com",
                            groupBy: "fragment",
                            description: "Google Docs - group by document"
                        },
                        {
                            pattern: "github\\.com/.+/issues",
                            groupBy: "fragment",
                            description: "GitHub Issues - group by issue page"
                        },
                        {
                            pattern: "stackoverflow\\.com/questions",
                            groupBy: "fragment",
                            description: "Stack Overflow - group by question"
                        },
                        {
                            pattern: ".*",
                            groupBy: "none",
                            description: "Default - no grouping"
                        }
                    ]
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

    toggleGroupedUrls(toggleBtn) {
        const resultItem = toggleBtn.closest('.result-item');
        const groupedContainer = resultItem.querySelector('.grouped-urls-container');

        if (groupedContainer) {
            const isCurrentlyVisible = groupedContainer.style.display !== 'none';

            if (isCurrentlyVisible) {
                // Hide the grouped URLs
                groupedContainer.style.display = 'none';
                toggleBtn.classList.remove('expanded');
            } else {
                // Show the grouped URLs
                groupedContainer.style.display = 'block';
                toggleBtn.classList.add('expanded');
            }
        }
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