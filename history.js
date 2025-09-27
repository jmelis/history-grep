class HistorySearchPro {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.sortSelect = document.getElementById('sortSelect');
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
        // Search input with debouncing
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });

        // Sort select
        this.sortSelect.addEventListener('change', () => {
            this.sortAndDisplayResults();
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

        const searchText = this.searchInput.value.trim();
        const { startTime, endTime } = this.getDateRange();

        try {
            const historyItems = await new Promise((resolve) => {
                chrome.history.search({
                    text: searchText,
                    startTime: startTime,
                    endTime: endTime,
                    maxResults: 5000
                }, resolve);
            });

            // Get visit details for period-specific visit counts
            if (this.sortSelect.value === 'visits-period') {
                await this.enrichWithPeriodVisits(historyItems, startTime, endTime);
            }

            this.currentResults = historyItems;
            this.sortAndDisplayResults();

        } catch (error) {
            console.error('Search error:', error);
            this.showNoResults();
        }
    }

    async enrichWithPeriodVisits(historyItems, startTime, endTime) {
        const visitPromises = historyItems.map(item =>
            new Promise((resolve) => {
                chrome.history.getVisits({ url: item.url }, (visits) => {
                    const periodVisits = visits.filter(visit =>
                        visit.visitTime >= startTime && visit.visitTime <= endTime
                    );
                    item.periodVisitCount = periodVisits.length;
                    resolve();
                });
            })
        );

        await Promise.all(visitPromises);
    }

    calculateRelevanceScore(item, searchText) {
        if (!searchText) return 1;

        const title = (item.title || '').toLowerCase();
        const url = item.url.toLowerCase();
        const search = searchText.toLowerCase();

        let score = 0;

        // Exact matches get highest score
        if (title.includes(search) || url.includes(search)) {
            score += 100;
        }

        // Word matches
        const searchWords = search.split(' ').filter(w => w.length > 0);
        searchWords.forEach(word => {
            if (title.includes(word)) score += 50;
            if (url.includes(word)) score += 30;
        });

        // Character similarity (simple fuzzy matching)
        score += this.getStringSimilarity(title, search) * 20;
        score += this.getStringSimilarity(url, search) * 10;

        // Boost recent and frequently visited items
        score += Math.log(item.visitCount + 1) * 5;

        const daysSinceVisit = (Date.now() - item.lastVisitTime) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSinceVisit);

        return Math.round(score);
    }

    getStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.getLevenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    getLevenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    sortAndDisplayResults() {
        const searchText = this.searchInput.value.trim();
        const sortBy = this.sortSelect.value;

        let sortedResults = [...this.currentResults];

        // Calculate relevance scores for all items if needed
        if (sortBy === 'relevance') {
            sortedResults.forEach(item => {
                item.relevanceScore = this.calculateRelevanceScore(item, searchText);
            });
        }

        // Sort based on selected criteria
        switch (sortBy) {
            case 'relevance':
                sortedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
                break;
            case 'recent':
                sortedResults.sort((a, b) => b.lastVisitTime - a.lastVisitTime);
                break;
            case 'visits-all':
                sortedResults.sort((a, b) => b.visitCount - a.visitCount);
                break;
            case 'visits-period':
                sortedResults.sort((a, b) => (b.periodVisitCount || 0) - (a.periodVisitCount || 0));
                break;
        }

        this.displayedResults = sortedResults;
        this.currentPage = 1;
        this.displayResults();
    }

    displayResults() {
        this.hideLoading();

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
        const relevanceScore = item.relevanceScore;
        const periodVisitCount = item.periodVisitCount;

        let metaItems = [
            `<span class="result-meta-item">Last visited: ${lastVisit}</span>`,
            `<span class="result-meta-item">Visits: ${visitCount}</span>`
        ];

        if (this.sortSelect.value === 'visits-period' && periodVisitCount !== undefined) {
            metaItems.push(`<span class="result-meta-item">Period visits: ${periodVisitCount}</span>`);
        }

        if (this.sortSelect.value === 'relevance' && relevanceScore !== undefined && this.searchInput.value.trim()) {
            metaItems.unshift(`<span class="result-meta-item"><span class="relevance-score">${relevanceScore}% match</span></span>`);
        }

        return `
            <div class="result-item">
                <a href="${url}" class="result-title" target="_blank">${this.escapeHtml(title)}</a>
                <div class="result-url">${this.escapeHtml(url)}</div>
                <div class="result-meta">
                    ${metaItems.join('')}
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