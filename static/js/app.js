// App State Management
const state = {
    releases: [],
    selectedIds: new Set(),
    searchQuery: '',
    categoryFilter: 'all',
    sortOrder: 'newest',
    isLoading: false,
    lastUpdated: ''
};

// Circular progress ring variables
const progressRingCircle = document.querySelector('.progress-ring__circle');
let ringCircumference = 0;
if (progressRingCircle) {
    const radius = progressRingCircle.r.baseVal.value;
    ringCircumference = radius * 2 * Math.PI;
    progressRingCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressRingCircle.style.strokeDashoffset = ringCircumference;
}

// DOM Elements
const elements = {
    releasesContainer: document.getElementById('releases-container'),
    noResults: document.getElementById('no-results'),
    searchInput: document.getElementById('search-input'),
    typeFilter: document.getElementById('type-filter'),
    sortOrder: document.getElementById('sort-order'),
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statIssues: document.getElementById('stat-issues'),
    statChanges: document.getElementById('stat-changes'),
    
    // Floating Selection Bar
    selectionBar: document.getElementById('selection-bar'),
    selectionCount: document.getElementById('selection-count'),
    tweetSelectedBtn: document.getElementById('tweet-selected-btn'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    tweetTextarea: document.getElementById('tweet-text'),
    charCount: document.getElementById('char-count'),
    tweetPreviewText: document.getElementById('tweet-preview-text'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    postTweetBtn: document.getElementById('post-tweet-btn')
};

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchReleases();
});

// Event Listeners Configuration
function initEventListeners() {
    // Search input
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderReleases();
    });

    // Category filter
    elements.typeFilter.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderReleases();
    });

    // Sort order
    elements.sortOrder.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        renderReleases();
    });

    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
        fetchReleases(true);
    });

    // Clear selection
    elements.clearSelectionBtn.addEventListener('click', () => {
        clearSelection();
    });

    // Tweet selected items
    elements.tweetSelectedBtn.addEventListener('click', () => {
        const selectedReleases = state.releases.filter(r => state.selectedIds.has(r.id));
        openTweetComposer(selectedReleases);
    });

    // Close Modal
    elements.closeModalBtn.addEventListener('click', closeTweetComposer);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            closeTweetComposer();
        }
    });

    // Keydown for Modal Esc close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.tweetModal.classList.contains('hidden')) {
            closeTweetComposer();
        }
    });

    // Live tweet editing
    elements.tweetTextarea.addEventListener('input', (e) => {
        updateTweetComposerMetrics(e.target.value);
    });

    // Copy to clipboard
    elements.copyTweetBtn.addEventListener('click', copyTweetToClipboard);
}

// Fetch Releases Data from API
async function fetchReleases(forceRefresh = false) {
    if (state.isLoading) return;
    
    toggleLoadingState(true);
    
    // Reset selection state
    clearSelection();
    
    try {
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            state.releases = result.data;
            state.lastUpdated = result.last_updated;
            
            // Render UI
            elements.lastUpdatedTime.textContent = state.lastUpdated;
            updateStatsSummary();
            renderReleases();
        } else {
            showErrorState(result.message);
        }
    } catch (error) {
        console.error("Fetch releases failed:", error);
        showErrorState("Unable to fetch release notes. Please try again.");
    } finally {
        toggleLoadingState(false);
    }
}

// Toggle Loading Spinner and skeleton states
function toggleLoadingState(loading) {
    state.isLoading = loading;
    
    const refreshIcon = elements.refreshBtn.querySelector('.refresh-icon');
    const statusDot = document.querySelector('.status-dot');
    
    if (loading) {
        refreshIcon.classList.add('spin');
        elements.refreshBtn.disabled = true;
        statusDot.classList.add('loading');
        
        // Render Skeleton Cards
        elements.releasesContainer.innerHTML = `
            <div class="skeleton-card card"><div class="skeleton-header"><div class="skeleton-title"></div><div class="skeleton-badge"></div></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
            <div class="skeleton-card card"><div class="skeleton-header"><div class="skeleton-title"></div><div class="skeleton-badge"></div></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
            <div class="skeleton-card card"><div class="skeleton-header"><div class="skeleton-title"></div><div class="skeleton-badge"></div></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
        `;
        elements.noResults.classList.add('hidden');
    } else {
        refreshIcon.classList.remove('spin');
        elements.refreshBtn.disabled = false;
        statusDot.classList.remove('loading');
    }
}

// Update Stats Cards in Sidebar
function updateStatsSummary() {
    const total = state.releases.length;
    const features = state.releases.filter(r => r.type.toLowerCase() === 'feature').length;
    const issues = state.releases.filter(r => r.type.toLowerCase() === 'issue').length;
    const changes = state.releases.filter(r => r.type.toLowerCase() === 'changed').length;
    
    elements.statTotal.textContent = total;
    elements.statFeatures.textContent = features;
    elements.statIssues.textContent = issues;
    elements.statChanges.textContent = changes;
}

// Render Release Cards based on filters & search
function renderReleases() {
    if (state.isLoading) return;
    
    elements.releasesContainer.innerHTML = '';
    
    // 1. Filter
    let filtered = state.releases.filter(item => {
        // Category filter
        const matchCategory = state.categoryFilter === 'all' || 
            item.type.toLowerCase() === state.categoryFilter.toLowerCase();
            
        // Search filter (searches date, type, and content plain text)
        const query = state.searchQuery.toLowerCase().trim();
        const matchSearch = query === '' || 
            item.text.toLowerCase().includes(query) || 
            item.date.toLowerCase().includes(query) || 
            item.type.toLowerCase().includes(query);
            
        return matchCategory && matchSearch;
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        // Compare dates. Note: date format is "Month DD, YYYY" or ISO strings.
        // We can parse or fallback to standard updated_datetime
        const dateA = new Date(a.updated_datetime || a.date);
        const dateB = new Date(b.updated_datetime || b.date);
        
        if (state.sortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // 3. Render Empty state if no items
    if (filtered.length === 0) {
        elements.noResults.classList.remove('hidden');
        return;
    }
    
    elements.noResults.classList.add('hidden');
    
    // 4. Create Card Nodes
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `release-card card ${state.selectedIds.has(item.id) ? 'selected' : ''}`;
        card.setAttribute('data-id', item.id);
        card.setAttribute('data-category', item.type);
        
        // Map badge class based on note category type
        let badgeClass = 'badge-update';
        const typeLower = item.type.toLowerCase();
        if (typeLower === 'feature') badgeClass = 'badge-feature';
        else if (typeLower === 'issue') badgeClass = 'badge-issue';
        else if (typeLower === 'changed') badgeClass = 'badge-changed';
        else if (typeLower === 'deprecated') badgeClass = 'badge-deprecated';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <div class="card-checkbox" title="Select update">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="card-date">${item.date}</span>
                </div>
                <span class="badge ${badgeClass}">${item.type}</span>
            </div>
            <div class="card-body">
                ${item.html}
            </div>
            <div class="card-actions">
                <button class="card-action-btn btn-tweet-action" title="Tweet this update">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Add Interactions
        // Clicking on the card body/checkbox selects it (ignoring links/buttons)
        card.addEventListener('click', (e) => {
            const isInteractive = e.target.closest('a') || e.target.closest('.card-action-btn');
            if (!isInteractive) {
                toggleCardSelection(item.id);
            }
        });
        
        // Click Tweet button
        const tweetBtn = card.querySelector('.btn-tweet-action');
        tweetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTweetComposer([item]);
        });
        
        elements.releasesContainer.appendChild(card);
    });
}

// Card Multi-select Toggle logic
function toggleCardSelection(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        state.selectedIds.add(id);
    }
    
    // Re-render only selection status on card without full draw
    const cardEl = document.querySelector(`.release-card[data-id="${id}"]`);
    if (cardEl) {
        if (state.selectedIds.has(id)) {
            cardEl.classList.add('selected');
        } else {
            cardEl.classList.remove('selected');
        }
    }
    
    updateSelectionBar();
}

// Clear all selected cards
function clearSelection() {
    state.selectedIds.clear();
    document.querySelectorAll('.release-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    updateSelectionBar();
}

// Update Bottom Action Bar based on selected count
function updateSelectionBar() {
    const count = state.selectedIds.size;
    
    if (count > 0) {
        elements.selectionCount.textContent = `${count} update${count > 1 ? 's' : ''} selected`;
        elements.selectionBar.classList.remove('hidden');
    } else {
        elements.selectionBar.classList.add('hidden');
    }
}

// Generate default tweet copy from selections
function generateTweetTemplate(selectedItems) {
    if (selectedItems.length === 0) return "";
    
    const hashtags = " #BigQuery #GoogleCloud";
    
    if (selectedItems.length === 1) {
        const item = selectedItems[0];
        let desc = item.text.trim().replace(/\s+/g, ' ');
        
        // Format: "BigQuery Update [June 15, 2026] (Feature): Description #BigQuery #GoogleCloud"
        const header = `BigQuery [${item.date}] (${item.type}): `;
        const maxDescLength = 280 - header.length - hashtags.length - 4; // margin for ellipsis
        
        if (desc.length > maxDescLength) {
            desc = desc.substring(0, maxDescLength) + "...";
        }
        
        return `${header}${desc}${hashtags}`;
    } else {
        // Multi-select template
        // Combine dates nicely
        let dates = selectedItems.map(r => r.date);
        dates = [...new Set(dates)];
        let dateSpan = dates[0];
        if (dates.length > 1) {
            // Short representation or just count
            dateSpan = `${dates[dates.length - 1]} - ${dates[0]}`;
        }
        
        const header = `BigQuery Updates (${dateSpan}):\n`;
        const listItems = [];
        const limit = Math.min(selectedItems.length, 3);
        
        // Allocate length budget
        const totalItemsCount = selectedItems.length;
        const footerText = totalItemsCount > limit ? `\n• +${totalItemsCount - limit} more` : '';
        const budget = 280 - header.length - hashtags.length - footerText.length - 15;
        const itemBudget = Math.floor(budget / limit);
        
        for (let i = 0; i < limit; i++) {
            const item = selectedItems[i];
            let itemText = item.text.trim().replace(/\s+/g, ' ');
            const linePrefix = `• [${item.type}] `;
            const textBudget = itemBudget - linePrefix.length;
            
            if (itemText.length > textBudget) {
                itemText = itemText.substring(0, textBudget) + "...";
            }
            listItems.push(`${linePrefix}${itemText}`);
        }
        
        return `${header}${listItems.join('\n')}${footerText}\n${hashtags}`;
    }
}

// Open Composer Modal
function openTweetComposer(selectedItems) {
    const text = generateTweetTemplate(selectedItems);
    elements.tweetTextarea.value = text;
    updateTweetComposerMetrics(text);
    
    elements.tweetModal.classList.remove('hidden');
    elements.tweetTextarea.focus();
    // Disable body scroll when modal is active
    document.body.style.overflow = 'hidden';
}

// Close Composer Modal
function closeTweetComposer() {
    elements.tweetModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Update circular character indicator & pre-render text
function updateTweetComposerMetrics(text) {
    const length = text.length;
    const remaining = 280 - length;
    
    // Update count display
    elements.charCount.textContent = remaining;
    
    if (remaining < 0) {
        elements.charCount.classList.add('text-issue');
        elements.charCount.classList.remove('text-muted');
    } else {
        elements.charCount.classList.remove('text-issue');
        elements.charCount.classList.add('text-muted');
    }
    
    // Update circular progress ring
    if (progressRingCircle) {
        const percentage = Math.min(length / 280, 1);
        const offset = ringCircumference - (percentage * ringCircumference);
        progressRingCircle.style.strokeDashoffset = offset;
        
        // Change color based on remaining chars
        if (remaining < 0) {
            progressRingCircle.style.stroke = 'var(--color-issue)';
        } else if (remaining <= 20) {
            progressRingCircle.style.stroke = 'var(--color-deprecated)';
        } else {
            progressRingCircle.style.stroke = 'var(--color-accent)';
        }
    }
    
    // Render Live Preview
    elements.tweetPreviewText.textContent = text || "Type something to preview...";
    
    // Update Intent URL Link
    const encodedText = encodeURIComponent(text);
    elements.postTweetBtn.setAttribute('href', `https://twitter.com/intent/tweet?text=${encodedText}`);
}

// Copy Tweet to Clipboard action
function copyTweetToClipboard() {
    const text = elements.tweetTextarea.value;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        // Visual Success Feedback
        const originalHTML = elements.copyTweetBtn.innerHTML;
        elements.copyTweetBtn.innerHTML = `<i class="fa-solid fa-check text-feature"></i> <span>Copied!</span>`;
        elements.copyTweetBtn.style.borderColor = 'var(--color-feature)';
        
        setTimeout(() => {
            elements.copyTweetBtn.innerHTML = originalHTML;
            elements.copyTweetBtn.style.borderColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Display error card in releases list container
function showErrorState(message) {
    elements.releasesContainer.innerHTML = `
        <div class="card" style="border-color: var(--color-issue); background-color: rgba(239,68,68,0.03); text-align: center; padding: 3rem 1.5rem;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 2.5rem; color: var(--color-issue); margin-bottom: 1rem;"></i>
            <h3 style="margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Something went wrong</h3>
            <p style="color: var(--text-muted); font-size: 0.92rem; max-width: 480px; margin: 0 auto 1.5rem auto;">${message}</p>
            <button onclick="fetchReleases(true)" class="btn btn-secondary">
                <i class="fa-solid fa-arrows-rotate"></i> Try Again
            </button>
        </div>
    `;
    elements.lastUpdatedTime.textContent = "Sync failed";
}
