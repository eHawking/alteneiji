/**
 * Alteneiji Admin Panel - JavaScript
 */

// API Configuration
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');

// =====================
// UTILITY FUNCTIONS
// =====================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// =====================
// AUTHENTICATION
// =====================

async function login(email, password) {
    showLoading();
    try {
        const response = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        authToken = response.data.token;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        showAdminPanel();
        loadDashboard();
        showToast('Welcome back!', 'success');
    } catch (error) {
        document.getElementById('login-error').textContent = error.message;
    } finally {
        hideLoading();
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-app').classList.add('hidden');
}

function showAdminPanel() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    document.getElementById('user-name').textContent = user.firstName || user.email || 'Admin';
}

// =====================
// NAVIGATION
// =====================

function navigateTo(pageId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // Update page visibility
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageId}`).classList.add('active');

    // Update header title
    const titles = {
        'dashboard': 'Dashboard',
        'pages': 'Pages',
        'products': 'Products',
        'services': 'Services',
        'ai-seo': 'AI SEO Generator',
        'ai-social': 'Social Media Generator',
        'ai-marketing': 'AI Marketing',
        'ai-video': 'AI Video Generator',
        'contacts': 'Contact Submissions',
        'gulfood': 'Gulfood 2026 Registrations',
        'users': 'User Management',
        'settings': 'Settings',
        'billing': 'Billing & Usage',
        'saved-posts': 'Saved Posts',
        'media': 'Media Library',
        'brands': 'Brand Management'
    };
    document.getElementById('page-title').textContent = titles[pageId] || pageId;

    // Close sidebar on mobile after navigation
    closeSidebar();

    // Load page data
    loadPageData(pageId);
}

// Sidebar toggle functions
function openSidebar() {
    document.querySelector('.sidebar').classList.add('open');
    document.querySelector('.sidebar-overlay').classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

window.closeSidebar = closeSidebar;
window.openSidebar = openSidebar;
window.toggleSidebar = toggleSidebar;


async function loadPageData(pageId) {
    switch (pageId) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'contacts':
            await loadContacts();
            break;
        case 'gulfood':
            await loadGulfood();
            break;
        case 'pages':
            await loadPages();
            break;
        case 'products':
            await loadProducts();
            break;
        case 'services':
            await loadServices();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'settings':
            await checkGeminiStatus();
            break;
        case 'ai-social':
            await loadPostsHistory();
            break;
        case 'billing':
            await loadBillingData();
            break;
        case 'saved-posts':
            await loadSavedPosts();
            break;
        case 'media':
            await loadMediaLibrary();
            break;
        case 'brands':
            await loadBrands();
            break;
    }
}

// =====================
// DASHBOARD
// =====================

async function loadDashboard() {
    try {
        const response = await apiRequest('/admin/dashboard');
        const { stats, recent } = response.data;

        // Update stats
        document.getElementById('stat-pages').textContent = stats.pages;
        document.getElementById('stat-products').textContent = stats.products;
        document.getElementById('stat-services').textContent = stats.services;
        document.getElementById('stat-contacts').textContent = stats.newContacts;

        // Update recent contacts
        const contactsContainer = document.getElementById('recent-contacts');
        if (recent.contacts.length > 0) {
            contactsContainer.innerHTML = recent.contacts.map(c => `
                <div class="list-item">
                    <div>
                        <strong>${c.name}</strong>
                        <span class="text-muted" style="color: var(--text-muted); font-size: 12px; margin-left: 10px;">${c.subject || 'No subject'}</span>
                    </div>
                    <span class="badge badge-${c.status}">${c.status}</span>
                </div>
            `).join('');
        } else {
            contactsContainer.innerHTML = '<p class="empty-state">No recent contacts</p>';
        }

        // Update recent posts
        const postsContainer = document.getElementById('recent-posts');
        if (recent.socialPosts.length > 0) {
            postsContainer.innerHTML = recent.socialPosts.map(p => `
                <div class="list-item">
                    <div>
                        <i class="fab fa-${p.platform === 'twitter' ? 'x-twitter' : p.platform}"></i>
                        <span style="margin-left: 10px;">${p.content.substring(0, 50)}...</span>
                    </div>
                    <span class="badge badge-${p.status}">${p.status}</span>
                </div>
            `).join('');
        } else {
            postsContainer.innerHTML = '<p class="empty-state">No scheduled posts</p>';
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// =====================
// AI SEO
// =====================

async function generateSEO() {
    const content = document.getElementById('seo-content').value;
    const contentType = document.getElementById('seo-type').value;

    if (!content.trim()) {
        showToast('Please enter content to analyze', 'error');
        return;
    }

    showLoading();
    try {
        const response = await apiRequest('/ai/seo/generate', {
            method: 'POST',
            body: JSON.stringify({ content, contentType })
        });

        const data = response.data;

        // Display results
        document.getElementById('seo-meta-title').textContent = data.meta_title || '-';
        document.getElementById('seo-meta-description').textContent = data.meta_description || '-';
        document.getElementById('seo-og-title').textContent = data.og_title || '-';
        document.getElementById('seo-og-description').textContent = data.og_description || '-';

        // Keywords
        const keywordsEl = document.getElementById('seo-keywords');
        keywordsEl.innerHTML = (data.keywords || []).map(k => `<span>${k}</span>`).join('');

        // Suggestions
        const suggestionsEl = document.getElementById('seo-suggestions');
        suggestionsEl.innerHTML = (data.suggestions || []).map(s => `<li>${s}</li>`).join('');

        document.getElementById('seo-results').classList.remove('hidden');
        showToast('SEO content generated successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to generate SEO', 'error');
    } finally {
        hideLoading();
    }
}

function copySEOResults() {
    const title = document.getElementById('seo-meta-title').textContent;
    const desc = document.getElementById('seo-meta-description').textContent;
    const ogTitle = document.getElementById('seo-og-title').textContent;
    const ogDesc = document.getElementById('seo-og-description').textContent;

    const text = `Meta Title: ${title}\nMeta Description: ${desc}\nOG Title: ${ogTitle}\nOG Description: ${ogDesc}`;
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
}

// =====================
// AI SOCIAL
// =====================

async function generateSocialPosts() {
    const topic = document.getElementById('social-topic').value;
    const tone = document.getElementById('social-tone').value;
    const platforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);
    const generateImages = document.getElementById('generate-images')?.checked ?? true;

    if (!topic.trim()) {
        showToast('Please enter a topic', 'error');
        return;
    }

    if (platforms.length === 0) {
        showToast('Please select at least one platform', 'error');
        return;
    }

    // Hide old results, show progress section with cards
    document.getElementById('social-progress').classList.add('hidden');
    document.getElementById('social-results').classList.remove('hidden');

    const container = document.querySelector('.social-posts-grid');
    container.innerHTML = '';

    const platformIcons = {
        instagram: 'fa-instagram',
        facebook: 'fa-facebook',
        twitter: 'fa-x-twitter',
        linkedin: 'fa-linkedin'
    };

    const platformColors = {
        instagram: '#E4405F',
        facebook: '#1877F2',
        twitter: '#1DA1F2',
        linkedin: '#0A66C2'
    };

    // Create placeholder cards for each platform with progress
    platforms.forEach(platform => {
        container.innerHTML += `
            <div class="social-post-card generating" id="post-card-${platform}" data-platform="${platform}">
                <div class="platform-header ${platform}">
                    <i class="fab ${platformIcons[platform] || 'fa-share-alt'}"></i>
                    <span>${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                    <span class="post-status" style="margin-left: auto;">
                        <i class="fas fa-spinner fa-spin"></i> <span class="percent-text">0%</span>
                    </span>
                </div>
                <div class="post-image generating-placeholder">
                    <div class="progress-circle">
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" stroke-width="8"/>
                            <circle class="progress-ring" cx="50" cy="50" r="45" fill="none" stroke="${platformColors[platform]}" stroke-width="8" 
                                    stroke-dasharray="283" stroke-dashoffset="283" stroke-linecap="round" transform="rotate(-90 50 50)"/>
                        </svg>
                        <span class="progress-value">0%</span>
                    </div>
                </div>
                <div class="post-content">
                    <div class="post-text skeleton-text">Generating content...</div>
                </div>
            </div>
        `;
    });

    // Generate content for all platforms IN PARALLEL
    const generatePromises = platforms.map(async (platform) => {
        const card = document.getElementById(`post-card-${platform}`);
        let progress = 0;

        // Start progress animation
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90;
            updateCardProgress(card, Math.floor(progress));
        }, 150);

        try {
            // Generate content for this specific platform
            const response = await apiRequest('/ai/social/generate-single', {
                method: 'POST',
                body: JSON.stringify({
                    topic,
                    tone,
                    platform,
                    generateImages
                })
            });

            clearInterval(progressInterval);

            const data = response.data;

            // Complete progress
            updateCardProgress(card, 100);
            await new Promise(r => setTimeout(r, 300));

            // Update card with actual content
            card.classList.remove('generating');
            const enableVoice = document.getElementById('enable-voice')?.checked;
            card.innerHTML = `
                <div class="platform-header ${platform}">
                    <i class="fab ${platformIcons[platform] || 'fa-share-alt'}"></i>
                    <span>${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                    <span class="badge badge-published" style="margin-left: auto;">✓ Done</span>
                </div>
                ${data.imageUrl ? `
                    <div class="post-image">
                        <img src="${data.imageUrl}" alt="${platform} post" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-image\\'></i>'">
                        <div class="post-image-actions">
                            <button onclick="openImageViewer('${data.imageUrl}')" title="View Full Size">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="openImageEditModal('${platform}', '${data.imageUrl}')" title="Edit Image">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="showRegeneratePopup('${platform}', '${data.imageUrl}')" title="Regenerate">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>` : ''}
                <div class="post-content">
                    <div class="post-text">${data.content || 'Content generated'}</div>
                    <div class="hashtags">
                        ${(data.hashtags || []).map(h => `<span>#${h}</span>`).join(' ')}
                    </div>
                </div>
                <div class="post-actions">
                    <button class="btn btn-secondary btn-sm" onclick="copyPostContent('${platform}', this)">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    ${enableVoice ? `<button class="btn btn-secondary btn-sm" onclick="speakPostContent(\`${(data.content || '').replace(/`/g, "'")}\`)">
                        <i class="fas fa-volume-up"></i>
                    </button>` : ''}
                    ${data.imageUrl ? `<button class="btn btn-primary btn-sm" onclick="downloadPostImage('${platform}', this)">
                        <i class="fas fa-download"></i> Download
                    </button>` : ''}
                </div>
            `;

            // Auto-save this post
            try {
                await apiRequest('/social/posts', {
                    method: 'POST',
                    body: JSON.stringify({
                        platform,
                        content: data.content,
                        hashtags: data.hashtags || [],
                        imageUrl: data.imageUrl || null,
                        aiGenerated: true,
                        aiPrompt: topic
                    })
                });
            } catch (saveErr) {
                console.error('Failed to save post:', saveErr);
            }

            return { platform, success: true };

        } catch (error) {
            clearInterval(progressInterval);
            card.classList.remove('generating');
            card.classList.add('error');
            card.querySelector('.post-status').innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
            card.querySelector('.post-text').textContent = error.message || 'Generation failed';
            console.error(`Failed to generate ${platform}:`, error);
            return { platform, success: false, error };
        }
    });

    // Wait for ALL platforms to complete
    await Promise.all(generatePromises);

    // Refresh history after all done
    await loadPostsHistory();
    showToast('All posts generated!', 'success');
}

function updateCardProgress(card, percent) {
    const progressRing = card.querySelector('.progress-ring');
    const progressValue = card.querySelector('.progress-value');
    const percentText = card.querySelector('.percent-text');

    if (progressRing) {
        // 283 is the circumference of circle with r=45
        const offset = 283 - (283 * percent / 100);
        progressRing.style.strokeDashoffset = offset;
    }
    if (progressValue) progressValue.textContent = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
}

function updateProgress(platform, percent, complete = false) {
    const card = document.getElementById(`progress-${platform}`);
    if (!card) return;

    card.querySelector('.progress-bar').style.width = `${percent}%`;
    card.querySelector('.progress-percent').textContent = `${percent}%`;

    if (complete) {
        card.classList.remove('generating');
        card.classList.add('complete');
    }
}

async function autoSavePosts(posts, topic, tone) {
    try {
        for (const [platform, data] of Object.entries(posts)) {
            if (data && data.content) {
                await apiRequest('/social/posts', {
                    method: 'POST',
                    body: JSON.stringify({
                        platform,
                        content: data.content,
                        hashtags: data.hashtags || [],
                        imageUrl: data.imageUrl || null,
                        aiGenerated: true,
                        aiPrompt: topic,
                        tone: tone
                    })
                });
            }
        }
    } catch (error) {
        console.error('Failed to auto-save posts:', error);
    }
}

async function loadPostsHistory() {
    // History section was removed, just skip
    const container = document.getElementById('posts-history');
    if (!container) return;

    try {
        const response = await apiRequest('/social/posts?limit=12');

        if (response.data && response.data.length > 0) {
            container.innerHTML = response.data.map(post => {
                const platformColors = {
                    instagram: '#E4405F',
                    facebook: '#1877F2',
                    twitter: '#1DA1F2',
                    linkedin: '#0A66C2'
                };
                const imageHtml = post.image_url
                    ? `<img src="${post.image_url}" alt="Post image">`
                    : `<i class="fab fa-${post.platform === 'twitter' ? 'x-twitter' : post.platform}"></i>`;

                return `
                    <div class="history-item">
                        <div class="history-item-image" style="background: ${platformColors[post.platform] || 'var(--bg-primary)'}20;">
                            ${imageHtml}
                        </div>
                        <div class="history-item-content">
                            <div class="platform-icon">
                                <i class="fab fa-${post.platform === 'twitter' ? 'x-twitter' : post.platform}" style="color: ${platformColors[post.platform]}"></i>
                                <span>${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}</span>
                            </div>
                            <div class="post-text">${post.content.substring(0, 100)}...</div>
                            <div class="post-date">${formatDate(post.created_at)}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="empty-state">No posts generated yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load posts history:', error);
    }
}

function downloadPostImage(platform, btn) {
    const card = btn.closest('.social-post-card');
    const img = card.querySelector('.post-image img');
    if (img) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `${platform}-post-${Date.now()}.jpg`;
        link.click();
    } else {
        showToast('No image to download', 'error');
    }
}

function copyPostContent(platform, btn) {
    const card = btn.closest('.social-post-card');
    const text = card.querySelector('.post-text').textContent;
    const hashtags = Array.from(card.querySelectorAll('.hashtags span'))
        .map(s => s.textContent).join(' ');

    navigator.clipboard.writeText(`${text}\n\n${hashtags}`);
    showToast(`${platform} post copied!`, 'success');
}

async function savePost(platform, btn) {
    const data = window.generatedPosts[platform];
    if (!data) return;

    try {
        await apiRequest('/social/posts', {
            method: 'POST',
            body: JSON.stringify({
                platform,
                content: data.content,
                hashtags: data.hashtags || [],
                aiGenerated: true,
                aiPrompt: document.getElementById('social-topic').value
            })
        });
        showToast(`${platform} post saved as draft!`, 'success');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-check"></i> Saved';
    } catch (error) {
        showToast(error.message || 'Failed to save post', 'error');
    }
}

async function saveAllPosts() {
    const cards = document.querySelectorAll('#social-results .social-post-card:not(.generating):not(.error)');

    if (!cards || cards.length === 0) {
        showToast('No posts to save', 'error');
        return;
    }

    showLoading();
    const topic = document.getElementById('social-topic')?.value || 'Generated post';
    let savedCount = 0;

    try {
        for (const card of cards) {
            const platform = card.dataset.platform;
            const content = card.querySelector('.post-text')?.textContent || '';
            const hashtagEls = card.querySelectorAll('.hashtags span');
            const hashtags = Array.from(hashtagEls).map(s => s.textContent.replace('#', ''));
            const imgEl = card.querySelector('.post-image img');
            const imageUrl = imgEl ? imgEl.src : null;

            if (content) {
                try {
                    await apiRequest('/social/posts', {
                        method: 'POST',
                        body: JSON.stringify({
                            platform,
                            content,
                            hashtags,
                            image_url: imageUrl,
                            aiGenerated: true,
                            aiPrompt: topic,
                            status: 'draft'
                        })
                    });
                    savedCount++;
                } catch (saveErr) {
                    console.error(`Failed to save ${platform}:`, saveErr);
                }
            }
        }

        showToast(`${savedCount} posts saved as drafts!`, 'success');
    } catch (error) {
        showToast(error.message || 'Failed to save posts', 'error');
    } finally {
        hideLoading();
    }
}

// =====================
// AI MARKETING
// =====================

async function generateMarketingCampaign() {
    const goal = document.getElementById('marketing-goal').value;
    const targetAudience = document.getElementById('marketing-audience').value;
    const budget = document.getElementById('marketing-budget').value;
    const duration = document.getElementById('marketing-duration').value;

    if (!goal.trim() || !targetAudience.trim()) {
        showToast('Please fill in campaign goal and target audience', 'error');
        return;
    }

    showLoading();
    try {
        const response = await apiRequest('/ai/marketing/campaign', {
            method: 'POST',
            body: JSON.stringify({ goal, targetAudience, budget, duration })
        });

        const campaign = response.data;

        document.getElementById('campaign-name').innerHTML = `
            <i class="fas fa-rocket"></i> ${campaign.campaign_name || 'Marketing Campaign'}
        `;

        let content = `
            <div class="campaign-section">
                <h4>📢 Tagline</h4>
                <p style="font-size: 18px; color: var(--accent-gold);">"${campaign.tagline || ''}"</p>
            </div>
            <div class="campaign-section">
                <h4>📋 Summary</h4>
                <p>${campaign.summary || ''}</p>
            </div>
        `;

        if (campaign.objectives && campaign.objectives.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>🎯 Objectives</h4>
                    <ul>${campaign.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
                </div>
            `;
        }

        if (campaign.channels && campaign.channels.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>📣 Channels</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${campaign.channels.map(c => `<span class="badge badge-published">${c}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        if (campaign.key_messages && campaign.key_messages.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>💬 Key Messages</h4>
                    <ul>${campaign.key_messages.map(m => `<li>${m}</li>`).join('')}</ul>
                </div>
            `;
        }

        if (campaign.kpis && campaign.kpis.length > 0) {
            content += `
                <div class="campaign-section">
                    <h4>📊 KPIs</h4>
                    <ul>${campaign.kpis.map(k => `<li>${k}</li>`).join('')}</ul>
                </div>
            `;
        }

        document.getElementById('campaign-content').innerHTML = content;
        document.getElementById('marketing-results').classList.remove('hidden');

        showToast('Campaign generated successfully!', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to generate campaign', 'error');
    } finally {
        hideLoading();
    }
}

// =====================
// CONTACTS & GULFOOD
// =====================

async function loadContacts() {
    try {
        const response = await apiRequest('/admin/contacts');
        const tbody = document.querySelector('#contacts-table tbody');

        tbody.innerHTML = response.data.map(c => `
            <tr>
                <td>${c.name}</td>
                <td>${c.email}</td>
                <td>${c.subject || '-'}</td>
                <td><span class="badge badge-${c.status}">${c.status}</span></td>
                <td>${formatDate(c.created_at)}</td>
                <td>
                    <button class="btn btn-ghost" onclick="viewContact('${c.uuid}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

async function loadGulfood() {
    try {
        const response = await apiRequest('/admin/gulfood');
        const tbody = document.querySelector('#gulfood-table tbody');

        tbody.innerHTML = response.data.map(r => `
            <tr>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.company || '-'}</td>
                <td>${r.country || '-'}</td>
                <td><span class="badge badge-${r.status}">${r.status}</span></td>
                <td>
                    <button class="btn btn-ghost" onclick="viewRegistration('${r.uuid}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load gulfood registrations:', error);
    }
}

// =====================
// DATA LOADING
// =====================

async function loadPages() {
    try {
        const response = await apiRequest('/pages');
        const tbody = document.querySelector('#pages-table tbody');

        tbody.innerHTML = response.data.map(p => `
            <tr>
                <td>${p.title}</td>
                <td>/${p.slug}</td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>${formatDate(p.updated_at)}</td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load pages:', error);
    }
}

async function loadProducts() {
    try {
        const response = await apiRequest('/products');
        const tbody = document.querySelector('#products-table tbody');

        tbody.innerHTML = response.data.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.category_name || '-'}</td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

async function loadServices() {
    try {
        const response = await apiRequest('/services');
        const tbody = document.querySelector('#services-table tbody');

        tbody.innerHTML = response.data.map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.category_name || '-'}</td>
                <td><span class="badge badge-${s.status}">${s.status}</span></td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load services:', error);
    }
}

async function loadUsers() {
    try {
        const response = await apiRequest('/admin/users');
        const tbody = document.querySelector('#users-table tbody');

        tbody.innerHTML = response.data.map(u => `
            <tr>
                <td>${u.first_name || ''} ${u.last_name || ''}</td>
                <td>${u.email}</td>
                <td>${u.role_name || 'user'}</td>
                <td>${formatDate(u.last_login)}</td>
                <td>
                    <button class="btn btn-ghost"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// =====================
// AI VIDEO GENERATOR
// =====================

async function generateVideo() {
    const prompt = document.getElementById('video-prompt').value;
    const platform = document.getElementById('video-platform').value;
    const style = document.getElementById('video-style').value;
    const duration = document.getElementById('video-duration').value;
    const aspect = document.getElementById('video-aspect').value;

    const options = {
        music: document.getElementById('video-music').checked,
        voiceover: document.getElementById('video-voiceover').checked,
        captions: document.getElementById('video-captions').checked,
        logo: document.getElementById('video-logo').checked
    };

    if (!prompt.trim()) {
        showToast('Please enter a video description', 'error');
        return;
    }

    const platformNames = {
        'sora': 'Sora 2 (OpenAI)',
        'veo': 'Veo 3.1 (Google)',
        'pippit': 'Pippit AI'
    };

    showLoading();
    try {
        const response = await apiRequest('/ai/video/generate', {
            method: 'POST',
            body: JSON.stringify({
                prompt,
                platform,
                style,
                duration: parseInt(duration),
                aspectRatio: aspect,
                options
            })
        });

        // Display results
        document.getElementById('video-result-platform').textContent = platformNames[platform];
        document.getElementById('video-result-status').textContent = 'Processing';
        document.getElementById('video-result-status').className = 'status-badge processing';

        const estimatedTime = duration <= 15 ? '~2 minutes' : duration <= 30 ? '~4 minutes' : '~6 minutes';
        document.getElementById('video-result-time').textContent = estimatedTime;

        document.getElementById('video-results').classList.remove('hidden');

        // Store job ID for status checking
        window.currentVideoJob = response.data?.jobId || null;

        showToast('Video generation started! This may take a few minutes.', 'success');

        // If we got a jobId, start polling for status
        if (response.data?.jobId) {
            pollVideoStatus(response.data.jobId);
        } else {
            // Demo mode - simulate completion after a delay
            simulateVideoCompletion();
        }
    } catch (error) {
        showToast(error.message || 'Failed to start video generation', 'error');
    } finally {
        hideLoading();
    }
}

async function pollVideoStatus(jobId) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    const checkStatus = async () => {
        try {
            const response = await apiRequest(`/ai/video/status/${jobId}`);
            const status = response.data.status;

            if (status === 'completed') {
                document.getElementById('video-result-status').textContent = 'Completed';
                document.getElementById('video-result-status').className = 'status-badge completed';
                document.getElementById('video-download-btn').classList.remove('hidden');
                document.getElementById('video-download-btn').onclick = () => {
                    window.open(response.data.videoUrl, '_blank');
                };

                // Update placeholder with video
                const placeholder = document.querySelector('.video-placeholder');
                placeholder.innerHTML = `
                    <video controls style="width: 100%; border-radius: 8px;">
                        <source src="${response.data.videoUrl}" type="video/mp4">
                    </video>
                `;

                showToast('Video generated successfully!', 'success');
                loadRecentVideos();
            } else if (status === 'failed') {
                document.getElementById('video-result-status').textContent = 'Failed';
                document.getElementById('video-result-status').className = 'status-badge failed';
                showToast('Video generation failed. Please try again.', 'error');
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkStatus, 5000);
            }
        } catch (error) {
            console.error('Error checking video status:', error);
        }
    };

    setTimeout(checkStatus, 5000);
}

function simulateVideoCompletion() {
    // Demo simulation for when API is not connected
    setTimeout(() => {
        document.getElementById('video-result-status').textContent = 'Completed';
        document.getElementById('video-result-status').className = 'status-badge completed';
        document.getElementById('video-download-btn').classList.remove('hidden');

        const placeholder = document.querySelector('.video-placeholder');
        placeholder.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--accent-green);"></i>
            <p>Video generated successfully!</p>
            <p class="text-muted">Note: Actual video generation requires API keys to be configured.</p>
        `;

        showToast('Video generation simulated! Configure API keys for actual generation.', 'success');
    }, 3000);
}

function refreshVideoStatus() {
    if (window.currentVideoJob) {
        pollVideoStatus(window.currentVideoJob);
        showToast('Refreshing status...', 'info');
    } else {
        showToast('No video job in progress', 'info');
    }
}

async function loadRecentVideos() {
    try {
        const response = await apiRequest('/ai/video/recent');
        const container = document.getElementById('recent-videos');

        if (response.data && response.data.length > 0) {
            container.innerHTML = response.data.map(v => `
                <div class="video-item">
                    <div class="video-thumbnail">
                        ${v.thumbnailUrl ? `<img src="${v.thumbnailUrl}" alt="Video thumbnail">` : '<i class="fas fa-film"></i>'}
                    </div>
                    <div class="video-details">
                        <h4>${v.prompt?.substring(0, 30) || 'Marketing Video'}...</h4>
                        <p>${v.platform} • ${v.duration}s • ${formatDate(v.created_at)}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load recent videos:', error);
    }
}

// =====================
// GEMINI API & SETTINGS
// =====================

function updateStatusIndicator(status, text) {
    const indicator = document.getElementById('gemini-status-indicator');
    if (!indicator) return;
    indicator.className = `status-indicator ${status}`;
    indicator.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
}

async function checkGeminiStatus() {
    const indicator = document.getElementById('gemini-status-indicator');
    if (!indicator) return;

    indicator.className = 'status-indicator checking';
    indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

    try {
        const response = await apiRequest('/ai/status');
        if (response.data && response.data.configured) {
            updateStatusIndicator('connected', 'Connected');
        } else {
            updateStatusIndicator('disconnected', 'Not Configured');
        }
    } catch (error) {
        updateStatusIndicator('disconnected', 'Error');
    }
}

async function testGeminiConnection() {
    const keyInput = document.getElementById('setting-gemini-key');
    const apiKey = keyInput.value.trim();

    if (!apiKey) {
        showToast('Please enter an API key to test', 'error');
        return;
    }

    // Update status to testing
    updateStatusIndicator('checking', 'Testing...');

    showLoading();
    try {
        const response = await apiRequest('/ai/test-connection', {
            method: 'POST',
            body: JSON.stringify({ apiKey })
        });

        if (response.success) {
            updateStatusIndicator('connected', 'Connected ✓');
            showToast('✓ Gemini API connection successful!', 'success');
        } else {
            updateStatusIndicator('disconnected', 'Invalid Key');
            showToast('✗ Connection failed: ' + (response.error || 'Invalid API key'), 'error');
        }
    } catch (error) {
        updateStatusIndicator('disconnected', 'Failed');
        showToast('✗ Connection failed: ' + (error.message || 'Could not connect'), 'error');
    } finally {
        hideLoading();
    }
}

async function saveGeminiApiKey() {
    const keyInput = document.getElementById('setting-gemini-key');
    const apiKey = keyInput.value.trim();

    if (!apiKey) {
        showToast('Please enter an API key to save', 'error');
        return;
    }

    updateStatusIndicator('checking', 'Saving...');

    showLoading();
    try {
        await apiRequest('/admin/settings/api-key', {
            method: 'POST',
            body: JSON.stringify({
                key: 'gemini_api_key',
                value: apiKey
            })
        });
        updateStatusIndicator('connected', 'Saved ✓');
        showToast('API key saved successfully!', 'success');
    } catch (error) {
        updateStatusIndicator('disconnected', 'Save Failed');
        showToast('Failed to save API key: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function toggleKeyVisibility() {
    const keyInput = document.getElementById('setting-gemini-key');
    const btn = document.getElementById('toggle-key-visibility');

    if (keyInput.type === 'password') {
        keyInput.type = 'text';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        keyInput.type = 'password';
        btn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

async function testSocialGenerator() {
    const resultDiv = document.getElementById('social-test-result');
    const btn = document.getElementById('test-social-btn');

    resultDiv.className = 'test-result loading';
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing Social Media Generator...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/ai/social/generate', {
            method: 'POST',
            body: JSON.stringify({
                topic: 'Alteneiji Group organic products',
                platforms: ['instagram'],
                tone: 'professional'
            })
        });

        if (response.success && response.data) {
            resultDiv.className = 'test-result success';
            const post = response.data.instagram?.content || 'Post generated successfully!';
            resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> <strong>Success!</strong><br><small>${post.substring(0, 100)}...</small>`;
        } else {
            throw new Error('No content generated');
        }
    } catch (error) {
        resultDiv.className = 'test-result error';
        resultDiv.innerHTML = `<i class="fas fa-times-circle"></i> <strong>Failed:</strong> ${error.message}`;
    } finally {
        btn.disabled = false;
    }
}

async function testSEOGenerator() {
    const resultDiv = document.getElementById('seo-test-result');
    const btn = document.getElementById('test-seo-btn');

    resultDiv.className = 'test-result loading';
    resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing SEO Generator...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/ai/seo/generate', {
            method: 'POST',
            body: JSON.stringify({
                content: 'Alteneiji Group is a Dubai-based import export company specializing in organic and sustainable products.',
                contentType: 'page'
            })
        });

        if (response.success && response.data) {
            resultDiv.className = 'test-result success';
            const title = response.data.meta_title || 'SEO generated successfully!';
            resultDiv.innerHTML = `<i class="fas fa-check-circle"></i> <strong>Success!</strong><br><small>Title: ${title}</small>`;
        } else {
            throw new Error('No SEO content generated');
        }
    } catch (error) {
        resultDiv.className = 'test-result error';
        resultDiv.innerHTML = `<i class="fas fa-times-circle"></i> <strong>Failed:</strong> ${error.message}`;
    } finally {
        btn.disabled = false;
    }
}

// =====================
// EVENT LISTENERS
// =====================

document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    if (authToken) {
        showAdminPanel();
        loadDashboard();
    } else {
        showLoginScreen();
    }

    // Login form
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Mobile menu toggle
    document.querySelector('.menu-toggle').addEventListener('click', () => {
        toggleSidebar();
    });

    // AI SEO Generate
    document.getElementById('generate-seo-btn').addEventListener('click', generateSEO);

    // AI Social Generate
    document.getElementById('generate-social-btn').addEventListener('click', generateSocialPosts);

    // AI Marketing Generate
    document.getElementById('generate-marketing-btn').addEventListener('click', generateMarketingCampaign);

    // AI Video Generate
    document.getElementById('generate-video-btn').addEventListener('click', generateVideo);
    document.getElementById('video-refresh-btn').addEventListener('click', refreshVideoStatus);

    // Gemini API Settings
    document.getElementById('test-gemini-btn').addEventListener('click', testGeminiConnection);
    document.getElementById('save-gemini-key-btn').addEventListener('click', saveGeminiApiKey);
    document.getElementById('toggle-key-visibility').addEventListener('click', toggleKeyVisibility);
    document.getElementById('test-social-btn').addEventListener('click', testSocialGenerator);
    document.getElementById('test-seo-btn').addEventListener('click', testSEOGenerator);

    // Save all social posts
    document.getElementById('save-all-posts').addEventListener('click', saveAllPosts);

    // Settings form
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        try {
            await apiRequest('/admin/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    settings: {
                        site_name: document.getElementById('setting-site-name').value,
                        site_tagline: document.getElementById('setting-tagline').value,
                        contact_email: document.getElementById('setting-email').value,
                        contact_phone: document.getElementById('setting-phone').value.split(',').map(p => p.trim()),
                        contact_address: document.getElementById('setting-address').value
                    }
                })
            });
            showToast('Settings saved successfully!', 'success');
        } catch (error) {
            showToast(error.message || 'Failed to save settings', 'error');
        } finally {
            hideLoading();
        }
    });
});

// Make functions globally available
window.copySEOResults = copySEOResults;
window.copyPostContent = copyPostContent;
window.savePost = savePost;
window.generateVideo = generateVideo;
window.refreshVideoStatus = refreshVideoStatus;
window.downloadPostImage = downloadPostImage;

// =====================
// BILLING & USAGE
// =====================

async function loadBillingData() {
    const period = document.getElementById('billing-period')?.value || 'month';

    try {
        const response = await apiRequest(`/admin/billing?period=${period}`);
        const { summary, recentActivity } = response.data;

        // Update summary stats
        document.getElementById('total-requests').textContent = summary.totalRequests.toLocaleString();
        document.getElementById('total-images').textContent = summary.totalImages.toLocaleString();
        document.getElementById('base-cost').textContent = `$${summary.baseCost.toFixed(4)}`;
        document.getElementById('total-billed').textContent = `$${summary.totalBilled.toFixed(4)}`;
        document.getElementById('input-tokens').textContent = summary.totalInputTokens.toLocaleString();
        document.getElementById('output-tokens').textContent = summary.totalOutputTokens.toLocaleString();

        // Update recent activity table
        const tbody = document.getElementById('recent-activity');
        if (tbody) {
            if (recentActivity && recentActivity.length > 0) {
                tbody.innerHTML = recentActivity.map(item => `
                    <tr>
                        <td><span class="badge badge-info">${item.operation || 'unknown'}</span></td>
                        <td>${item.model || 'gemini'}</td>
                        <td><strong>$${parseFloat(item.total_cost || 0).toFixed(4)}</strong></td>
                        <td>${new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No API activity recorded yet</td></tr>';
            }
        }
    } catch (error) {
        console.error('Failed to load billing data:', error);
        // Show zeros on error
        document.getElementById('total-requests').textContent = '0';
        document.getElementById('total-images').textContent = '0';
        document.getElementById('base-cost').textContent = '$0.00';
        document.getElementById('total-billed').textContent = '$0.00';
    }
}

// Setup billing period change listener
document.addEventListener('DOMContentLoaded', () => {
    const periodSelect = document.getElementById('billing-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', loadBillingData);
    }
});

// =====================
// SOCIAL GENERATOR ADVANCED FEATURES
// =====================

// Store attached image and logo as base64
let attachedImageData = null;
let logoImageData = null;

function handleImageAttach(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            attachedImageData = e.target.result;
            document.getElementById('attached-image-src').src = attachedImageData;
            document.getElementById('attached-image-preview').classList.remove('hidden');
            document.getElementById('attach-custom-image').checked = true;
            // Disable AI image generation when custom image is attached
            document.getElementById('generate-images').checked = false;
        };
        reader.readAsDataURL(file);
    }
}

function removeAttachedImage() {
    attachedImageData = null;
    document.getElementById('attached-image-preview').classList.add('hidden');
    document.getElementById('attach-custom-image').checked = false;
    document.getElementById('generate-images').checked = true;
}

function handleLogoUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            logoImageData = e.target.result;
            document.getElementById('logo-src').src = logoImageData;
            document.getElementById('logo-preview').classList.remove('hidden');
            document.getElementById('add-logo').checked = true;
        };
        reader.readAsDataURL(file);
    }
}

function removeLogo() {
    logoImageData = null;
    document.getElementById('logo-preview').classList.add('hidden');
    document.getElementById('add-logo').checked = false;
}

// Voice TTS for post content
function speakPostContent(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
        showToast('Playing audio...', 'info');
    } else {
        showToast('Voice not supported in this browser', 'error');
    }
}

// Regenerate Image Popup
function showRegeneratePopup(platform, currentImageUrl) {
    const modal = document.createElement('div');
    modal.className = 'regenerate-modal';
    modal.id = 'regenerate-modal';
    modal.innerHTML = `
        <div class="regenerate-modal-content">
            <h3><i class="fas fa-sync-alt"></i> Regenerate Image for ${platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
            <div class="form-group">
                <label>Current Image:</label>
                <img src="${currentImageUrl}" style="width: 100%; border-radius: 8px; margin-bottom: 15px;">
            </div>
            <div class="form-group">
                <label>Custom Prompt (optional):</label>
                <textarea id="regenerate-prompt" placeholder="Describe the image you want... Leave empty for a new variation"></textarea>
            </div>
            <div class="regenerate-modal-actions">
                <button class="btn btn-secondary" onclick="closeRegenerateModal()">Cancel</button>
                <button class="btn btn-primary" onclick="regenerateImage('${platform}')">
                    <i class="fas fa-magic"></i> Regenerate
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeRegenerateModal() {
    const modal = document.getElementById('regenerate-modal');
    if (modal) modal.remove();
}

async function regenerateImage(platform) {
    const customPrompt = document.getElementById('regenerate-prompt')?.value || '';
    const topic = document.getElementById('social-topic')?.value || 'professional marketing';

    closeRegenerateModal();
    showToast('Regenerating image...', 'info');

    try {
        const response = await apiRequest('/ai/regenerate-image', {
            method: 'POST',
            body: JSON.stringify({
                platform,
                prompt: customPrompt || topic
            })
        });

        if (response.data && response.data.imageUrl) {
            // Update the image in the post card
            const card = document.getElementById(`post-card-${platform}`);
            if (card) {
                const img = card.querySelector('.post-image img');
                if (img) {
                    img.src = response.data.imageUrl;
                }
            }
            showToast('Image regenerated!', 'success');
        } else {
            showToast('Failed to regenerate image', 'error');
        }
    } catch (error) {
        showToast(error.message || 'Image regeneration failed', 'error');
    }
}

// Make new functions globally available
window.handleImageAttach = handleImageAttach;
window.removeAttachedImage = removeAttachedImage;
window.handleLogoUpload = handleLogoUpload;
window.removeLogo = removeLogo;
window.speakPostContent = speakPostContent;
window.showRegeneratePopup = showRegeneratePopup;
window.closeRegenerateModal = closeRegenerateModal;
window.regenerateImage = regenerateImage;

// Toggle tool button active state
function toggleTool(checkboxId, button) {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        button.classList.toggle('active', checkbox.checked);
    }
}

window.toggleTool = toggleTool;

// =====================
// SAVED POSTS PAGE
// =====================

let allSavedPosts = [];

async function loadSavedPosts() {
    const grid = document.getElementById('saved-posts-grid');
    if (!grid) return;

    const searchTerm = document.getElementById('posts-search')?.value?.toLowerCase() || '';
    const platformFilter = document.getElementById('posts-platform-filter')?.value || '';
    const dateFilter = document.getElementById('posts-date-filter')?.value || '';

    try {
        const response = await apiRequest('/social/posts');
        allSavedPosts = response.data || [];

        // Update post count in header
        const countEl = document.getElementById('posts-count');
        if (countEl) countEl.textContent = allSavedPosts.length;

        // Apply filters
        let filtered = allSavedPosts;

        if (searchTerm) {
            filtered = filtered.filter(p => (p.content || '').toLowerCase().includes(searchTerm));
        }
        if (platformFilter) {
            filtered = filtered.filter(p => p.platform === platformFilter);
        }
        if (dateFilter) {
            const now = new Date();
            filtered = filtered.filter(p => {
                const d = new Date(p.created_at);
                if (dateFilter === 'today') return d.toDateString() === now.toDateString();
                if (dateFilter === 'week') return (now - d) < 7 * 24 * 60 * 60 * 1000;
                if (dateFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                return true;
            });
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<p class="empty-state">No posts found. Generate some posts first!</p>';
            return;
        }

        const platformIcons = {
            instagram: 'fa-instagram',
            facebook: 'fa-facebook',
            twitter: 'fa-x-twitter',
            linkedin: 'fa-linkedin'
        };

        grid.innerHTML = filtered.map(post => `
            <div class="social-post-card post-card-editable" data-post-id="${post.id}" data-platform="${post.platform}">
                <div class="platform-header ${post.platform}">
                    <i class="fab ${platformIcons[post.platform] || 'fa-share-alt'}"></i>
                    <span>${(post.platform || 'unknown').charAt(0).toUpperCase() + (post.platform || '').slice(1)}</span>
                    <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                ${post.image_url ? `
                    <div class="post-image">
                        <img src="${post.image_url}" alt="" onclick="openImageViewer('${post.image_url}')" onerror="this.parentElement.remove()">
                        <div class="post-image-actions">
                            <button onclick="openImageViewer('${post.image_url}')" title="View Full Size">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="openImageEditModal('${post.platform}', '${post.image_url}')" title="Edit Image">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="regeneratePostImage(${post.id}, '${post.platform}')" title="Regenerate">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                ` : ''}
                <div class="post-content">
                    <div class="post-text" contenteditable="true" data-post-id="${post.id}" 
                         onblur="autoSavePost(${post.id}, this.innerText)">${post.content || ''}</div>
                    <span class="post-save-status" id="save-status-${post.id}"></span>
                </div>
                <div class="post-actions-row">
                    <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${encodeURIComponent(post.content || '')}')">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    ${post.image_url ? `<button class="btn btn-secondary btn-sm" onclick="downloadFile('${post.image_url}', 'post-${post.id}.png')">
                        <i class="fas fa-download"></i> Image
                    </button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<p class="empty-state">Failed to load posts</p>';
        console.error('Failed to load saved posts:', error);
    }
}

// Auto-save post content
async function autoSavePost(postId, newContent) {
    const statusEl = document.getElementById(`save-status-${postId}`);
    if (statusEl) statusEl.textContent = 'Saving...';

    try {
        await apiRequest('/social/posts/' + postId, 'PUT', { content: newContent });
        if (statusEl) statusEl.textContent = '✓ Saved';
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
    } catch (error) {
        if (statusEl) statusEl.textContent = '✗ Failed';
        console.error('Auto-save failed:', error);
    }
}

// Regenerate post image
async function regeneratePostImage(postId, platform) {
    const customPrompt = prompt('Enter description for new image (or leave blank for same topic):');
    if (customPrompt === null) return;

    showToast('Regenerating image...', 'info');

    try {
        const response = await apiRequest('/ai/regenerate-image', 'POST', {
            platform: platform,
            prompt: customPrompt || 'social media post image',
            postId: postId
        });

        if (response.success && response.imageUrl) {
            // Update endpoint to save new image to post
            await apiRequest('/social/posts/' + postId, 'PUT', { image_url: response.imageUrl });
            showToast('Image regenerated!', 'success');
            loadSavedPosts(); // Refresh
        }
    } catch (error) {
        showToast('Failed to regenerate image', 'error');
        console.error(error);
    }
}

// Delete post
async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;

    try {
        await apiRequest('/social/posts/' + postId, 'DELETE');
        showToast('Post deleted', 'success');
        loadSavedPosts();
    } catch (error) {
        showToast('Failed to delete', 'error');
    }
}

// Add filter event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('posts-search');
    const platformFilter = document.getElementById('posts-platform-filter');
    const dateFilter = document.getElementById('posts-date-filter');

    if (searchInput) searchInput.addEventListener('input', debounce(loadSavedPosts, 300));
    if (platformFilter) platformFilter.addEventListener('change', loadSavedPosts);
    if (dateFilter) dateFilter.addEventListener('change', loadSavedPosts);

    // Filter pill click handlers
    document.querySelectorAll('.filter-pill[data-platform]').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill[data-platform]').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            // Update hidden select for backwards compatibility
            const platformSelect = document.getElementById('posts-platform-filter');
            if (platformSelect) platformSelect.value = pill.dataset.platform;
            loadSavedPosts();
        });
    });

    // View toggle for media library
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const grid = document.getElementById('media-grid');
            if (grid) {
                grid.classList.toggle('list-view', btn.dataset.view === 'list');
            }
        });
    });
});

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(decodeURIComponent(text));
    showToast('Copied to clipboard!', 'success');
}

// =====================
// MEDIA LIBRARY PAGE
// =====================

async function loadMediaLibrary() {
    const grid = document.getElementById('media-grid');
    if (!grid) return;

    // Show loading animation on refresh button
    const refreshBtn = document.querySelector('[onclick="loadMediaLibrary()"]');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Loading...';
        refreshBtn.disabled = true;
    }

    try {
        // Get all posts that have images
        const response = await apiRequest('/social/posts');
        const posts = response.data || [];

        // Extract unique images from posts
        let images = [];
        const seenUrls = new Set();

        posts.forEach(post => {
            // Check image_url (first image from media_urls)
            if (post.image_url && !seenUrls.has(post.image_url)) {
                seenUrls.add(post.image_url);
                images.push({
                    url: post.image_url,
                    name: `${post.platform}-${new Date(post.created_at).toLocaleDateString().replace(/\//g, '-')}.png`,
                    platform: post.platform,
                    date: new Date(post.created_at)
                });
            }
            // Also check media_urls array if it exists
            if (post.media_urls && Array.isArray(post.media_urls)) {
                post.media_urls.forEach((url, i) => {
                    if (url && !seenUrls.has(url)) {
                        seenUrls.add(url);
                        images.push({
                            url: url,
                            name: `${post.platform}-${i + 1}-${new Date(post.created_at).toLocaleDateString().replace(/\//g, '-')}.png`,
                            platform: post.platform,
                            date: new Date(post.created_at)
                        });
                    }
                });
            }
        });

        // Store all images for filtering
        window.allMediaImages = images;

        // Apply filters
        const searchTerm = document.getElementById('media-search')?.value?.toLowerCase() || '';
        const sortBy = document.getElementById('media-sort')?.value || 'newest';

        // Filter by search
        if (searchTerm) {
            images = images.filter(img =>
                img.name.toLowerCase().includes(searchTerm) ||
                img.platform.toLowerCase().includes(searchTerm)
            );
        }

        // Sort
        if (sortBy === 'newest') {
            images.sort((a, b) => b.date - a.date);
        } else if (sortBy === 'oldest') {
            images.sort((a, b) => a.date - b.date);
        } else if (sortBy === 'name') {
            images.sort((a, b) => a.name.localeCompare(b.name));
        }

        if (images.length === 0) {
            grid.innerHTML = '<p class="empty-state"><i class="fas fa-photo-video"></i><br>No images found' + (searchTerm ? ' for "' + searchTerm + '"' : '') + '</p>';
            return;
        }

        const platformColors = {
            instagram: '#E4405F',
            facebook: '#1877F2',
            twitter: '#1DA1F2',
            linkedin: '#0A66C2'
        };

        // Check view mode
        const isListView = document.querySelector('.view-btn[data-view="list"]')?.classList.contains('active');
        grid.className = isListView ? 'media-library-list' : 'media-library-grid';

        grid.innerHTML = images.map(file => `
            <div class="media-item">
                <img src="${file.url}" alt="${file.name}" onclick="openImageViewer('${file.url}')" onerror="this.parentElement.remove()">
                <div class="media-overlay">
                    <div class="media-platform" style="background: ${platformColors[file.platform] || '#666'}">
                        <i class="fab fa-${file.platform === 'twitter' ? 'x-twitter' : file.platform}"></i>
                    </div>
                    <span class="media-name">${file.name}</span>
                </div>
                <div class="post-image-actions">
                    <button onclick="openImageViewer('${file.url}')" title="View Full Size">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="openImageEditModal('${file.platform}', '${file.url}')" title="Edit Image">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="downloadFile('${file.url}', '${file.name}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `).join('');

        showToast(`Loaded ${images.length} images`, 'success');
    } catch (error) {
        grid.innerHTML = '<p class="empty-state"><i class="fas fa-exclamation-triangle"></i><br>Failed to load media</p>';
        console.error('Failed to load media:', error);
    } finally {
        // Reset refresh button
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Refresh';
            refreshBtn.disabled = false;
        }
    }
}

function setMediaView(view, btn) {
    // Update active button
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update grid class
    const grid = document.getElementById('media-grid');
    if (grid) {
        grid.className = view === 'list' ? 'media-library-list' : 'media-library-grid';
    }
}

window.setMediaView = setMediaView;

function showImagePreview(url) {
    const modal = document.createElement('div');
    modal.className = 'regenerate-modal';
    modal.onclick = () => modal.remove();
    modal.innerHTML = `<img src="${url}" style="max-width: 90%; max-height: 90%; border-radius: 12px;">`;
    document.body.appendChild(modal);
}

function downloadFile(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'download';
    a.click();
}

window.loadSavedPosts = loadSavedPosts;
window.loadMediaLibrary = loadMediaLibrary;
window.copyToClipboard = copyToClipboard;
window.showImagePreview = showImagePreview;
window.downloadFile = downloadFile;
window.autoSavePost = autoSavePost;
window.regeneratePostImage = regeneratePostImage;
window.deletePost = deletePost;
window.downloadAllMedia = async function () {
    const modal = document.getElementById('download-modal');
    const progressBar = document.getElementById('download-progress-bar');
    const progressText = document.getElementById('download-progress-text');
    const statusText = document.getElementById('download-status');

    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
        showToast('ZIP library not loaded. Downloading individual files...', 'warning');
        const images = document.querySelectorAll('#media-grid .media-item img');
        images.forEach((img, i) => {
            setTimeout(() => downloadFile(img.src, `image-${i + 1}.png`), i * 500);
        });
        return;
    }

    try {
        // Show modal
        modal.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Preparing download... 0%';
        statusText.textContent = 'Fetching image list...';

        // Get all posts with images
        const response = await apiRequest('/social/posts');
        const posts = response.data || [];

        // Extract unique images
        const images = [];
        const seenUrls = new Set();
        posts.forEach(post => {
            if (post.image_url && !seenUrls.has(post.image_url)) {
                seenUrls.add(post.image_url);
                images.push({
                    url: post.image_url,
                    name: `${post.platform}-${new Date(post.created_at).toLocaleDateString().replace(/\//g, '-')}.png`,
                    platform: post.platform
                });
            }
        });

        if (images.length === 0) {
            modal.classList.add('hidden');
            showToast('No images to download', 'warning');
            return;
        }

        statusText.textContent = `Found ${images.length} images. Creating ZIP...`;
        const zip = new JSZip();
        const folder = zip.folder('social-media-images');

        let completed = 0;

        // Download and add each image to ZIP
        for (const img of images) {
            try {
                statusText.textContent = `Downloading: ${img.name}`;

                const imgResponse = await fetch(img.url);
                if (!imgResponse.ok) throw new Error('Fetch failed');
                const blob = await imgResponse.blob();

                // Generate unique filename
                const fileName = `${img.platform}-${Date.now()}-${completed + 1}.png`;
                folder.file(fileName, blob);

                completed++;
                const percent = Math.round((completed / images.length) * 100);
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
            } catch (err) {
                console.warn(`Failed to fetch ${img.url}:`, err);
                completed++;
            }
        }

        statusText.textContent = 'Generating ZIP file...';
        progressText.textContent = '100%';
        progressBar.style.width = '100%';

        // Generate ZIP
        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            const percent = Math.round(metadata.percent);
            statusText.textContent = `Compressing... ${percent}%`;
        });

        // Trigger download
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `social-media-images-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);

        modal.classList.add('hidden');
        showToast(`Downloaded ${completed} images as ZIP!`, 'success');
    } catch (error) {
        console.error('ZIP download failed:', error);
        modal.classList.add('hidden');
        showToast('Download failed: ' + error.message, 'error');
    }
};

// Voice Input - Speech to Text
let recognition = null;
let isListening = false;

window.toggleVoiceInput = function (btn) {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast('Voice input not supported in this browser. Try Chrome or Edge.', 'error');
        return;
    }

    const topicInput = document.getElementById('social-topic');
    if (!topicInput) return;

    if (isListening) {
        // Stop listening
        if (recognition) {
            recognition.stop();
        }
        isListening = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        showToast('Voice input stopped', 'info');
        return;
    }

    // Start listening
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = function () {
        isListening = true;
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-microphone-alt" style="color: #ef4444;"></i>';
        showToast('Listening... Speak your topic', 'info');
    };

    recognition.onresult = function (event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        // Update input with transcription
        if (finalTranscript) {
            topicInput.value = finalTranscript;
        } else if (interimTranscript) {
            topicInput.value = interimTranscript;
        }
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';

        if (event.error === 'no-speech') {
            showToast('No speech detected. Try again.', 'warning');
        } else if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow microphone.', 'error');
        } else {
            showToast('Voice input error: ' + event.error, 'error');
        }
    };

    recognition.onend = function () {
        isListening = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-microphone"></i>';

        if (topicInput.value.trim()) {
            showToast('Voice input captured!', 'success');
        }
    };

    recognition.start();
};

// =====================
// BRAND MANAGEMENT
// =====================

let allBrands = [];

async function loadBrands() {
    const list = document.getElementById('brands-list');
    if (!list) return;

    try {
        const response = await apiRequest('/brands');
        allBrands = response.data || [];

        if (allBrands.length === 0) {
            list.innerHTML = '<p class="empty-state"><i class="fas fa-crown"></i><br>No brands yet. Add your first brand!</p>';
            return;
        }

        list.innerHTML = allBrands.map(brand => `
            <div class="brand-card">
                <div class="brand-header">
                    <div class="brand-icon"><i class="fas fa-crown"></i></div>
                    <div class="brand-info">
                        <h3>${brand.name}</h3>
                        ${brand.website ? `<a href="${brand.website}" target="_blank">${brand.website}</a>` : ''}
                    </div>
                </div>
                ${brand.about ? `<p class="brand-about">${brand.about.substring(0, 150)}${brand.about.length > 150 ? '...' : ''}</p>` : ''}
                <div class="brand-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editBrand(${brand.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteBrand(${brand.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = '<p class="empty-state"><i class="fas fa-exclamation-triangle"></i><br>Failed to load brands</p>';
        console.error('Failed to load brands:', error);
    }
}

function showBrandForm(brand = null) {
    const formCard = document.getElementById('brand-form-card');
    const formTitle = document.getElementById('brand-form-title');
    const logoPreview = document.getElementById('brand-logo-preview');
    const logoPlaceholder = document.getElementById('brand-logo-placeholder');
    formCard.classList.remove('hidden');

    if (brand) {
        formTitle.textContent = 'Edit Brand';
        document.getElementById('brand-id').value = brand.id;
        document.getElementById('brand-name').value = brand.name || '';
        document.getElementById('brand-website').value = brand.website || '';
        document.getElementById('brand-about').value = brand.about || '';
        document.getElementById('brand-logo-url').value = brand.logo_url || '';

        // Show logo preview if exists
        if (brand.logo_url) {
            logoPreview.src = brand.logo_url;
            logoPreview.style.display = 'block';
            logoPlaceholder.style.display = 'none';
        } else {
            logoPreview.style.display = 'none';
            logoPlaceholder.style.display = 'flex';
        }
    } else {
        formTitle.textContent = 'Add New Brand';
        document.getElementById('brand-form').reset();
        document.getElementById('brand-id').value = '';
        document.getElementById('brand-logo-url').value = '';
        logoPreview.style.display = 'none';
        logoPlaceholder.style.display = 'flex';
    }
}

function hideBrandForm() {
    document.getElementById('brand-form-card').classList.add('hidden');
    document.getElementById('brand-form').reset();
    document.getElementById('brand-logo-preview').style.display = 'none';
    document.getElementById('brand-logo-placeholder').style.display = 'flex';
}

// Preview logo when selected
function previewBrandLogo(input) {
    const preview = document.getElementById('brand-logo-preview');
    const placeholder = document.getElementById('brand-logo-placeholder');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            // Store as base64 for now (for small logos)
            document.getElementById('brand-logo-url').value = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Fetch website info using AI
async function fetchWebsiteInfo() {
    const websiteInput = document.getElementById('brand-website');
    const aboutInput = document.getElementById('brand-about');
    const fetchBtn = document.getElementById('fetch-website-btn');
    const url = websiteInput.value.trim();

    if (!url) {
        showToast('Please enter a website URL first', 'warning');
        return;
    }

    // Validate URL
    try {
        new URL(url);
    } catch {
        showToast('Please enter a valid URL', 'error');
        return;
    }

    // Show loading
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';

    try {
        // Use AI to generate about text based on URL
        const response = await apiRequest('/ai/analyze-website', {
            method: 'POST',
            body: JSON.stringify({ url })
        });

        if (response.data && response.data.about) {
            aboutInput.value = response.data.about;
            showToast('Website info fetched!', 'success');
        } else {
            // Fallback: just set the domain as brand info
            const domain = new URL(url).hostname.replace('www.', '');
            aboutInput.value = `${domain} - A professional business. Visit their website to learn more about their products and services.`;
            showToast('Basic info generated. You can edit it.', 'info');
        }
    } catch (error) {
        // Fallback on error
        const domain = new URL(url).hostname.replace('www.', '');
        aboutInput.value = `${domain} - Visit the website to learn more about their services and offerings.`;
        showToast('Could not fetch full info. Basic description added.', 'warning');
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = '<i class="fas fa-magic"></i> Fetch Info';
    }
}

async function saveBrand(event) {
    event.preventDefault();

    const id = document.getElementById('brand-id').value;
    const data = {
        name: document.getElementById('brand-name').value,
        website: document.getElementById('brand-website').value || null,
        about: document.getElementById('brand-about').value || null,
        logoUrl: document.getElementById('brand-logo-url').value || null
    };

    try {
        if (id) {
            await apiRequest(`/brands/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('Brand updated!', 'success');
        } else {
            await apiRequest('/brands', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('Brand created!', 'success');
        }

        hideBrandForm();
        await loadBrands();
    } catch (error) {
        showToast('Failed to save brand: ' + error.message, 'error');
    }
}

function editBrand(id) {
    const brand = allBrands.find(b => b.id === id);
    if (brand) {
        showBrandForm(brand);
    }
}

async function deleteBrand(id) {
    const brand = allBrands.find(b => b.id === id);
    const brandName = brand ? brand.name : 'this brand';

    // Show styled confirmation popup
    const modal = document.createElement('div');
    modal.className = 'regenerate-modal';
    modal.innerHTML = `
        <div class="confirm-popup">
            <div class="confirm-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <h3>Delete Brand?</h3>
            <p>Are you sure you want to delete <strong>${brandName}</strong>?<br>This action cannot be undone.</p>
            <div class="confirm-actions">
                <button class="btn btn-secondary" onclick="this.closest('.regenerate-modal').remove()">Cancel</button>
                <button class="btn btn-danger" onclick="confirmDeleteBrand(${id}, this.closest('.regenerate-modal'))">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmDeleteBrand(id, modal) {
    try {
        await apiRequest(`/brands/${id}`, { method: 'DELETE' });
        modal.remove();
        showToast('Brand deleted!', 'success');
        await loadBrands();
    } catch (error) {
        modal.remove();
        showToast('Failed to delete brand: ' + error.message, 'error');
    }
}

window.loadBrands = loadBrands;
window.showBrandForm = showBrandForm;
window.hideBrandForm = hideBrandForm;
window.saveBrand = saveBrand;
window.editBrand = editBrand;
window.deleteBrand = deleteBrand;
window.confirmDeleteBrand = confirmDeleteBrand;
window.previewBrandLogo = previewBrandLogo;
window.fetchWebsiteInfo = fetchWebsiteInfo;

// =====================
// TONE DROPDOWN
// =====================

function toggleToneDropdown(btn) {
    const dropdown = btn.closest('.tone-dropdown');
    dropdown.classList.toggle('open');

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 10);
}

function selectTone(value, text, element) {
    document.getElementById('social-tone').value = value;
    document.getElementById('selected-tone-text').textContent = text;

    // Update active state
    document.querySelectorAll('.tone-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');

    // Close dropdown
    element.closest('.tone-dropdown').classList.remove('open');
}

window.toggleToneDropdown = toggleToneDropdown;
window.selectTone = selectTone;

// =====================
// UNIVERSAL POST TOGGLE
// =====================

function toggleUniversalPost(label) {
    const universalCheckbox = label.querySelector('input');
    const isChecked = universalCheckbox.checked;

    // Get all platform checkboxes
    const platformCheckboxes = document.querySelectorAll('.platform-toggle:not(.universal) input[name="platform"]');

    if (isChecked) {
        // Universal is selected - uncheck all individual platforms
        platformCheckboxes.forEach(cb => {
            cb.checked = false;
        });
    } else {
        // Universal is deselected - select all individual platforms
        platformCheckboxes.forEach(cb => {
            cb.checked = true;
        });
    }
}

// Also handle clicking individual platforms to uncheck universal
document.addEventListener('DOMContentLoaded', () => {
    const platformCheckboxes = document.querySelectorAll('.platform-toggle:not(.universal) input[name="platform"]');

    platformCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const universalCheckbox = document.querySelector('.platform-toggle.universal input');
            if (universalCheckbox && cb.checked) {
                universalCheckbox.checked = false;
            }
        });
    });
});

window.toggleUniversalPost = toggleUniversalPost;

// =====================
// MULTI-IMAGE ATTACHMENT
// =====================

// Store attached images as base64 data
let attachedImages = [];
const MAX_IMAGES = 5;

function handleMultiImageAttach(input) {
    const files = Array.from(input.files);

    if (attachedImages.length + files.length > MAX_IMAGES) {
        showToast(`Maximum ${MAX_IMAGES} images allowed`, 'warning');
        input.value = '';
        return;
    }

    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            showToast('Please select only image files', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            attachedImages.push({
                data: e.target.result,
                name: file.name,
                type: file.type
            });
            renderAttachedImages();
            updateAttachCount();
        };
        reader.readAsDataURL(file);
    });

    input.value = ''; // Reset input
}

function renderAttachedImages() {
    const gallery = document.getElementById('attached-images-gallery');
    const grid = document.getElementById('attached-images-grid');

    if (attachedImages.length === 0) {
        gallery.classList.add('hidden');
        return;
    }

    gallery.classList.remove('hidden');
    grid.innerHTML = attachedImages.map((img, index) => `
        <div class="attached-image-thumb" onclick="openImagePreview('${img.data.replace(/'/g, "\\'")}')">
            <img src="${img.data}" alt="${img.name}">
            <button class="remove-btn" onclick="event.stopPropagation(); removeAttachedImageByIndex(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeAttachedImageByIndex(index) {
    attachedImages.splice(index, 1);
    renderAttachedImages();
    updateAttachCount();
}

function clearAllAttachedImages() {
    attachedImages = [];
    renderAttachedImages();
    updateAttachCount();
    showToast('All images cleared', 'info');
}

function updateAttachCount() {
    const countBadge = document.getElementById('attach-count');
    const attachBtn = document.getElementById('tool-attach');

    if (attachedImages.length > 0) {
        countBadge.textContent = attachedImages.length;
        countBadge.classList.remove('hidden');
        attachBtn.classList.add('active');
    } else {
        countBadge.classList.add('hidden');
        attachBtn.classList.remove('active');
    }
}

function openImagePreview(imageSrc) {
    const modal = document.getElementById('image-preview-modal');
    const img = document.getElementById('preview-modal-image');
    img.src = imageSrc;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeImagePreview() {
    const modal = document.getElementById('image-preview-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Close preview on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeImagePreview();
    }
});

// Expose functions globally
window.handleMultiImageAttach = handleMultiImageAttach;
window.removeAttachedImageByIndex = removeAttachedImageByIndex;
window.clearAllAttachedImages = clearAllAttachedImages;
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;

// Export attachedImages for use in generation
window.getAttachedImages = () => attachedImages;

// =====================
// VIDEO DROPDOWN FUNCTIONS  
// =====================

function toggleVideoDropdown(btn, type) {
    const dropdown = btn.closest('.video-dropdown');
    const wasOpen = dropdown.classList.contains('open');

    // Close all video dropdowns first
    document.querySelectorAll('.video-dropdown').forEach(d => d.classList.remove('open'));

    // Toggle the clicked one
    if (!wasOpen) {
        dropdown.classList.add('open');
    }
}

function selectVideoOption(type, value, displayText, element) {
    // Update the hidden input
    const inputId = type === 'platform' ? 'video-platform' :
        type === 'style' ? 'video-style' :
            type === 'duration' ? 'video-duration' : 'video-aspect';

    document.getElementById(inputId).value = value;

    // Update the button text
    const textId = type === 'platform' ? 'selected-platform-text' :
        type === 'style' ? 'selected-style-text' :
            type === 'duration' ? 'selected-duration-text' : 'selected-aspect-text';

    document.getElementById(textId).textContent = displayText;

    // Update active state
    element.closest('.video-dropdown-menu').querySelectorAll('.video-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');

    // Close dropdown
    element.closest('.video-dropdown').classList.remove('open');
}

// Close video dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.video-dropdown')) {
        document.querySelectorAll('.video-dropdown').forEach(d => d.classList.remove('open'));
    }
});

window.toggleVideoDropdown = toggleVideoDropdown;
window.selectVideoOption = selectVideoOption;

// =====================
// BRAND SELECTOR MODAL
// =====================

async function showBrandModal() {
    const modal = document.getElementById('brand-modal');
    const list = document.getElementById('brand-modal-list');
    modal.classList.remove('hidden');

    // Load brands
    try {
        const response = await apiRequest('/brands');
        const brands = response.data || [];

        if (brands.length === 0) {
            list.innerHTML = `
                <p class="empty-state">
                    <i class="fas fa-crown"></i><br>
                    No brands yet.<br>
                    <a href="#brands" onclick="closeBrandModal(); navigateToPage('brands');">Create a brand first</a>
                </p>`;
            return;
        }

        const selectedId = document.getElementById('selected-brand-id').value;

        list.innerHTML = brands.map(brand => `
            <div class="brand-select-item ${brand.id == selectedId ? 'selected' : ''}" 
                 onclick="selectBrandForPost(${brand.id}, '${brand.name.replace(/'/g, "\\'")}')">
                <div class="brand-icon"><i class="fas fa-crown"></i></div>
                <span class="brand-name">${brand.name}</span>
                <i class="fas fa-check brand-check"></i>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = '<p class="empty-state"><i class="fas fa-exclamation-triangle"></i><br>Failed to load brands</p>';
    }
}

function closeBrandModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('brand-modal').classList.add('hidden');
}

function selectBrandForPost(id, name) {
    document.getElementById('selected-brand-id').value = id;
    document.getElementById('selected-brand-name').textContent = name;
    document.getElementById('selected-brand-name').style.display = 'inline-flex';

    // Update selection UI
    document.querySelectorAll('.brand-select-item').forEach(item => item.classList.remove('selected'));
    event.target.closest('.brand-select-item').classList.add('selected');
}

function clearSelectedBrand() {
    document.getElementById('selected-brand-id').value = '';
    document.getElementById('selected-brand-name').style.display = 'none';
    document.querySelectorAll('.brand-select-item').forEach(item => item.classList.remove('selected'));
}

window.showBrandModal = showBrandModal;
window.closeBrandModal = closeBrandModal;
window.selectBrandForPost = selectBrandForPost;
window.clearSelectedBrand = clearSelectedBrand;

// =====================
// IMAGE VIEWER WITH ZOOM
// =====================

let currentZoom = 1;

function openImageViewer(url) {
    const modal = document.getElementById('image-viewer-modal');
    const img = document.getElementById('viewer-image');

    currentZoom = 1;
    img.src = url;
    img.style.transform = `scale(${currentZoom})`;
    document.getElementById('zoom-level').textContent = '100%';

    modal.classList.remove('hidden');
}

function closeImageViewer() {
    document.getElementById('image-viewer-modal').classList.add('hidden');
}

function zoomImage(delta) {
    currentZoom = Math.max(0.25, Math.min(3, currentZoom + delta));
    document.getElementById('viewer-image').style.transform = `scale(${currentZoom})`;
    document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
}

function resetZoom() {
    currentZoom = 1;
    document.getElementById('viewer-image').style.transform = `scale(1)`;
    document.getElementById('zoom-level').textContent = '100%';
}

window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;
window.zoomImage = zoomImage;
window.resetZoom = resetZoom;

// =====================
// IMAGE EDIT MODAL
// =====================

let currentEditImageUrl = '';

function openImageEdit(url) {
    const modal = document.getElementById('image-edit-modal');
    const preview = document.getElementById('edit-image-preview');

    currentEditImageUrl = url;
    preview.src = url;
    document.getElementById('edit-image-prompt').value = '';

    modal.classList.remove('hidden');
}

function closeImageEdit() {
    document.getElementById('image-edit-modal').classList.add('hidden');
}

async function applyImageEdit() {
    const prompt = document.getElementById('edit-image-prompt').value.trim();

    if (!prompt) {
        showToast('Please enter an edit prompt', 'warning');
        return;
    }

    showToast('Image editing not yet implemented. Coming soon!', 'info');
    closeImageEdit();
}

window.openImageEdit = openImageEdit;
window.closeImageEdit = closeImageEdit;
window.applyImageEdit = applyImageEdit;

// Update showImagePreview to use new viewer
window.showImagePreview = function (url) {
    openImageViewer(url);
};

// =====================
// CACHE MANAGEMENT
// =====================

async function clearAllCache() {
    const btn = document.getElementById('clear-cache-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Clearing...</span>';
        btn.disabled = true;
    }

    try {
        // Clear localStorage
        localStorage.clear();
        console.log('✓ LocalStorage cleared');

        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✓ SessionStorage cleared');

        // Clear Service Worker caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('✓ Service Worker caches cleared:', cacheNames.length);
        }

        // Unregister service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            console.log('✓ Service Workers unregistered:', registrations.length);
        }

        // Clear cookies (current path)
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        });
        console.log('✓ Cookies cleared');

        showToast('Cache cleared! Reloading...', 'success');

        // Hard reload after short delay
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);

    } catch (error) {
        console.error('Cache clear error:', error);
        showToast('Cache cleared partially. Reloading...', 'warning');
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    }
}

window.clearAllCache = clearAllCache;

// =====================
// IMAGE VIEWER
// =====================

function openImageViewer(imageUrl) {
    const modal = document.getElementById('image-viewer-modal');
    const img = document.getElementById('viewer-image');
    if (modal && img) {
        img.src = imageUrl;
        modal.classList.remove('hidden');
    }
}

function closeImageViewer() {
    const modal = document.getElementById('image-viewer-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;

// =====================
// REGENERATE POPUP
// =====================

let currentRegeneratePlatform = '';
let currentRegenerateImageUrl = '';

function showRegeneratePopup(platform, imageUrl) {
    currentRegeneratePlatform = platform;
    currentRegenerateImageUrl = imageUrl;

    const modal = document.createElement('div');
    modal.className = 'regenerate-modal';
    modal.id = 'regenerate-modal';
    modal.innerHTML = `
        <div class="regenerate-popup">
            <div class="popup-header">
                <i class="fas fa-sync-alt"></i>
                <h3>Regenerate Image</h3>
                <button class="modal-close" onclick="closeRegeneratePopup()"><i class="fas fa-times"></i></button>
            </div>
            <div class="popup-body">
                <div class="current-image-preview">
                    <img src="${imageUrl}" alt="Current image">
                    <span class="preview-label">Current Image</span>
                </div>
                <div class="form-group">
                    <label><i class="fas fa-magic"></i> New Prompt</label>
                    <textarea id="regenerate-prompt" rows="3" placeholder="Describe what you want for the new image..."></textarea>
                    <small class="form-hint">e.g., "Professional office setting with modern design"</small>
                </div>
            </div>
            <div class="popup-footer">
                <button class="btn btn-secondary" onclick="closeRegeneratePopup()">Cancel</button>
                <button class="btn btn-primary" onclick="executeRegenerate()">
                    <i class="fas fa-sync-alt"></i> Regenerate
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeRegeneratePopup() {
    const modal = document.getElementById('regenerate-modal');
    if (modal) modal.remove();
}

async function executeRegenerate() {
    const prompt = document.getElementById('regenerate-prompt').value.trim();
    const btn = document.querySelector('#regenerate-modal .btn-primary');

    if (!prompt) {
        showToast('Please enter a prompt for the new image', 'warning');
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/ai/regenerate-image', {
            method: 'POST',
            body: JSON.stringify({
                platform: currentRegeneratePlatform,
                prompt: prompt
            })
        });

        if (response.data && response.data.imageUrl) {
            // Update the image in the card
            const card = document.getElementById(`post-card-${currentRegeneratePlatform}`);
            if (card) {
                const img = card.querySelector('.post-image img');
                if (img) {
                    img.src = response.data.imageUrl;
                    // Update button URLs
                    const actions = card.querySelector('.post-image-actions');
                    if (actions) {
                        actions.innerHTML = `
                            <button onclick="openImageViewer('${response.data.imageUrl}')" title="View Full Size">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="openImageEditModal('${currentRegeneratePlatform}', '${response.data.imageUrl}')" title="Edit Image">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="showRegeneratePopup('${currentRegeneratePlatform}', '${response.data.imageUrl}')" title="Regenerate">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        `;
                    }
                }
            }
            closeRegeneratePopup();
            showToast('Image regenerated!', 'success');
        }
    } catch (error) {
        showToast('Failed to regenerate: ' + error.message, 'error');
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Regenerate';
        btn.disabled = false;
    }
}

window.showRegeneratePopup = showRegeneratePopup;
window.closeRegeneratePopup = closeRegeneratePopup;
window.executeRegenerate = executeRegenerate;

// =====================
// IMAGE EDIT MODAL
// =====================

let currentEditPlatform = '';

function openImageEditModal(platform, imageUrl) {
    currentEditPlatform = platform;
    currentEditImageUrl = imageUrl;

    const modal = document.createElement('div');
    modal.className = 'regenerate-modal';
    modal.id = 'image-edit-modal-dynamic';
    modal.innerHTML = `
        <div class="image-edit-popup">
            <div class="popup-header">
                <i class="fas fa-edit"></i>
                <h3>Edit Image</h3>
                <button class="modal-close" onclick="closeImageEditModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="popup-body">
                <div class="edit-image-container">
                    <img id="live-edit-preview" src="${imageUrl}" alt="Edit preview">
                </div>
                <div class="form-group">
                    <label><i class="fas fa-wand-magic-sparkles"></i> Edit Instructions</label>
                    <textarea id="image-edit-instructions" rows="3" placeholder="Describe what changes you want to make..."></textarea>
                    <small class="form-hint">e.g., "Add warm sunset lighting", "Make colors more vibrant", "Add company logo in corner"</small>
                </div>
            </div>
            <div class="popup-footer">
                <button class="btn btn-secondary" onclick="closeImageEditModal()">Cancel</button>
                <button class="btn btn-primary" onclick="applyLiveEdit()">
                    <i class="fas fa-check"></i> Apply Changes
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeImageEditModal() {
    const modal = document.getElementById('image-edit-modal-dynamic');
    if (modal) modal.remove();
}

async function applyLiveEdit() {
    const instructions = document.getElementById('image-edit-instructions').value.trim();
    const btn = document.querySelector('#image-edit-modal-dynamic .btn-primary');

    if (!instructions) {
        showToast('Please enter edit instructions', 'warning');
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
    btn.disabled = true;

    try {
        // For now, use regenerate API with edit context
        const response = await apiRequest('/ai/regenerate-image', {
            method: 'POST',
            body: JSON.stringify({
                platform: currentEditPlatform,
                prompt: `Edit the current image: ${instructions}`
            })
        });

        if (response.data && response.data.imageUrl) {
            // Update preview
            document.getElementById('live-edit-preview').src = response.data.imageUrl;
            currentEditImageUrl = response.data.imageUrl;

            // Update card image
            const card = document.getElementById(`post-card-${currentEditPlatform}`);
            if (card) {
                const img = card.querySelector('.post-image img');
                if (img) {
                    img.src = response.data.imageUrl;
                }
            }

            showToast('Edit applied!', 'success');
            btn.innerHTML = '<i class="fas fa-check"></i> Apply Changes';
            btn.disabled = false;
        }
    } catch (error) {
        showToast('Failed to apply edit: ' + error.message, 'error');
        btn.innerHTML = '<i class="fas fa-check"></i> Apply Changes';
        btn.disabled = false;
    }
}

window.openImageEditModal = openImageEditModal;
window.closeImageEditModal = closeImageEditModal;
window.applyLiveEdit = applyLiveEdit;

// =====================
// BILLING & USAGE
// =====================

async function loadBillingData() {
    const period = document.getElementById('billing-period')?.value || 'month';

    try {
        const response = await apiRequest(`/admin/billing?period=${period}`);
        const data = response.data;

        if (data && data.summary) {
            // Update summary cards
            document.getElementById('total-requests').textContent =
                formatNumber(data.summary.totalRequests || 0);
            document.getElementById('total-images').textContent =
                formatNumber(data.summary.totalImages || 0);
            document.getElementById('base-cost').textContent =
                formatCurrency(data.summary.baseCost || 0);
            document.getElementById('total-billed').textContent =
                formatCurrency(data.summary.totalBilled || 0);

            // Token usage
            document.getElementById('input-tokens').textContent =
                formatNumber(data.summary.totalInputTokens || 0);
            document.getElementById('output-tokens').textContent =
                formatNumber(data.summary.totalOutputTokens || 0);
        }

        // Update recent activity table
        const table = document.getElementById('billing-table');
        if (table && data.recentActivity) {
            const tbody = table.querySelector('tbody') || table;
            tbody.innerHTML = data.recentActivity.length > 0
                ? data.recentActivity.map(item => `
                    <tr>
                        <td><span class="badge">${item.operation || '-'}</span></td>
                        <td>${item.model || '-'}</td>
                        <td>${formatCurrency(item.total_cost || 0)}</td>
                        <td>${formatDateTime(item.created_at)}</td>
                    </tr>
                `).join('')
                : '<tr><td colspan="4" class="text-center">No recent activity</td></tr>';
        }

    } catch (error) {
        console.error('Failed to load billing data:', error);
        showToast('Failed to load billing data', 'error');
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Add event listener for billing period change
document.addEventListener('DOMContentLoaded', () => {
    const billingPeriod = document.getElementById('billing-period');
    if (billingPeriod) {
        billingPeriod.addEventListener('change', () => {
            loadBillingData();
        });
    }
});

window.loadBillingData = loadBillingData;

// =====================
// WEBSOCKET FOR INBOX
// =====================

let inboxSocket = null;
let inboxReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function initInboxWebSocket() {
    // Only connect if on inbox page
    const isInboxPage = window.location.hash === '#inbox';
    if (!isInboxPage && inboxSocket) {
        inboxSocket.close();
        inboxSocket = null;
        return;
    }

    if (inboxSocket && inboxSocket.readyState === WebSocket.OPEN) {
        return; // Already connected
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

    try {
        inboxSocket = new WebSocket(wsUrl);

        inboxSocket.onopen = () => {
            console.log('WebSocket connected');
            inboxReconnectAttempts = 0;

            // Authenticate if logged in
            if (authToken) {
                inboxSocket.send(JSON.stringify({
                    type: 'authenticate',
                    token: authToken
                }));
            }
        };

        inboxSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleInboxWebSocketMessage(data);
            } catch (e) {
                console.error('WebSocket message parse error:', e);
            }
        };

        inboxSocket.onclose = () => {
            console.log('WebSocket disconnected');
            inboxSocket = null;

            // Reconnect if still on inbox page
            if (window.location.hash === '#inbox' && inboxReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                inboxReconnectAttempts++;
                setTimeout(initInboxWebSocket, 3000 * inboxReconnectAttempts);
            }
        };

        inboxSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    } catch (e) {
        console.warn('WebSocket not available:', e);
    }
}

function handleInboxWebSocketMessage(data) {
    switch (data.type) {
        case 'connected':
            console.log('Inbox WebSocket ready:', data.clientId);
            break;

        case 'new_message':
            // Add message to chat if conversation is open
            addIncomingMessage(data.message);
            // Update unread badge
            updateUnreadBadge(1);
            // Show notification
            showToast('New message received', 'info');
            break;

        case 'new_conversation':
            // Add to conversations list
            addNewConversation(data.conversation);
            updateUnreadBadge(1);
            break;

        case 'whatsapp_qr':
            // Update QR code display
            updateWhatsAppQR(data.channelId, data.qrCode);
            break;

        case 'whatsapp_ready':
            showToast('WhatsApp connected successfully!', 'success');
            // Refresh channels list
            if (typeof loadChannels === 'function') loadChannels();
            break;

        case 'whatsapp_disconnected':
            showToast('WhatsApp disconnected: ' + data.reason, 'warning');
            break;

        case 'typing':
            showTypingIndicator(data.conversationId, data.isTyping);
            break;

        default:
            console.log('Unknown WebSocket message:', data.type);
    }
}

function addIncomingMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${message.direction}`;
    msgDiv.innerHTML = `
        <div class="message-bubble">
            <p>${escapeHtml(message.content)}</p>
            <span class="message-time">${formatMessageTime(message.created_at)}</span>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addNewConversation(conversation) {
    const list = document.getElementById('conversations-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'conversation-item unread';
    item.dataset.id = conversation.uuid;
    item.dataset.platform = conversation.platform || 'whatsapp';
    item.onclick = () => openConversation(conversation.uuid);
    item.innerHTML = `
        <div class="conv-avatar">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.contact_name || 'Unknown')}&background=25D366&color=fff" alt="">
            <span class="platform-icon ${conversation.platform || 'whatsapp'}"><i class="fab fa-${conversation.platform || 'whatsapp'}"></i></span>
        </div>
        <div class="conv-details">
            <div class="conv-header">
                <span class="conv-name">${escapeHtml(conversation.contact_name || 'Unknown')}</span>
                <span class="conv-time">Just now</span>
            </div>
            <div class="conv-preview">
                <span class="conv-message">${escapeHtml(conversation.last_message || 'New conversation')}</span>
                <span class="unread-badge">1</span>
            </div>
        </div>
    `;
    list.insertBefore(item, list.firstChild);
}

function updateUnreadBadge(increment) {
    const badge = document.getElementById('inbox-unread-badge');
    if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + increment;
    }
}

function updateWhatsAppQR(channelId, qrCode) {
    const qrContainer = document.getElementById(`qr-${channelId}`);
    if (qrContainer && qrCode) {
        // Generate QR code image from qr string
        // This would require a QR code library like qrcode.js
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}" alt="QR Code">`;
    }
}

function showTypingIndicator(conversationId, isTyping) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.classList.toggle('hidden', !isTyping);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initialize WebSocket when navigating to inbox
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#inbox') {
        initInboxWebSocket();
        loadInboxData();
    } else if (window.location.hash === '#agents') {
        loadAgents();
    } else if (window.location.hash === '#channels') {
        loadChannels();
    }
});

// Initialize on page load if already on inbox
if (window.location.hash === '#inbox') {
    document.addEventListener('DOMContentLoaded', () => {
        initInboxWebSocket();
        loadInboxData();
    });
} else if (window.location.hash === '#agents') {
    document.addEventListener('DOMContentLoaded', loadAgents);
} else if (window.location.hash === '#channels') {
    document.addEventListener('DOMContentLoaded', loadChannels);
}

// =====================
// INBOX DATA LOADING
// =====================

async function loadInboxData() {
    try {
        const result = await apiRequest('/inbox/conversations');
        if (result.success) {
            renderConversationsList(result.data);
        }
    } catch (error) {
        console.error('Error loading inbox:', error);
    }
}

function renderConversationsList(conversations) {
    const list = document.getElementById('conversations-list');
    if (!list) return;

    if (!conversations || conversations.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px; text-align: center;">
                <i class="fas fa-inbox" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px;"></i>
                <p style="color: var(--text-secondary);">No conversations yet</p>
                <span style="font-size: 12px; color: var(--text-muted);">Connect a channel to start receiving messages</span>
            </div>
        `;
        return;
    }

    list.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
             data-id="${conv.uuid}" data-platform="${conv.platform || 'whatsapp'}"
             onclick="openConversation('${conv.uuid}')">
            <div class="conv-avatar">
                <img src="${conv.contact_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.contact_name || 'U')}&background=25D366&color=fff`}" alt="">
                <span class="platform-icon ${conv.platform || 'whatsapp'}">
                    <i class="fab fa-${conv.platform || 'whatsapp'}"></i>
                </span>
            </div>
            <div class="conv-details">
                <div class="conv-header">
                    <span class="conv-name">${escapeHtml(conv.contact_name || conv.contact_identifier || 'Unknown')}</span>
                    <span class="conv-time">${formatRelativeTime(conv.last_message_at)}</span>
                </div>
                <div class="conv-preview">
                    <span class="conv-message">${escapeHtml(conv.last_message || 'No messages')}</span>
                    ${conv.unread_count > 0 ? `<span class="unread-badge">${conv.unread_count}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function openConversation(uuid) {
    try {
        const result = await apiRequest(`/inbox/conversations/${uuid}`);
        if (result.success) {
            renderChatArea(result.data.conversation, result.data.messages);
            renderContactDetails(result.data.conversation);

            // Mark as active in list
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id === uuid);
            });
        }
    } catch (error) {
        console.error('Error opening conversation:', error);
    }
}

function renderChatArea(conversation, messages) {
    const chatHeader = document.querySelector('.chat-header');
    const chatMessages = document.getElementById('chat-messages');

    if (chatHeader) {
        chatHeader.innerHTML = `
            <div class="chat-contact-info">
                <img src="${conversation.contact_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.contact_name || 'U')}&background=25D366&color=fff`}" alt="" class="chat-avatar">
                <div class="chat-contact-details">
                    <h4>${escapeHtml(conversation.contact_name || 'Unknown')}</h4>
                    <span class="chat-status"><i class="fas fa-circle"></i> ${conversation.platform || 'WhatsApp'}</span>
                </div>
            </div>
            <div class="chat-actions">
                <button class="btn-icon" title="Search"><i class="fas fa-search"></i></button>
                <button class="btn-icon" title="Call"><i class="fas fa-phone"></i></button>
                <button class="btn-icon" title="More"><i class="fas fa-ellipsis-v"></i></button>
            </div>
        `;
    }

    if (chatMessages) {
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-comments" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px;"></i>
                    <p>No messages yet</p>
                </div>
            `;
        } else {
            chatMessages.innerHTML = messages.map(msg => `
                <div class="chat-message ${msg.direction}">
                    <div class="message-bubble">
                        <p>${escapeHtml(msg.content)}</p>
                        <span class="message-time">
                            ${formatMessageTime(msg.created_at)}
                            ${msg.direction === 'outgoing' ? '<i class="fas fa-check-double"></i>' : ''}
                        </span>
                    </div>
                </div>
            `).join('');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
}

function renderContactDetails(conversation) {
    const profile = document.querySelector('.contact-profile');
    if (profile) {
        profile.innerHTML = `
            <img src="${conversation.contact_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.contact_name || 'U')}&background=25D366&color=fff&size=80`}" alt="" class="profile-avatar">
            <h3>${escapeHtml(conversation.contact_name || 'Unknown')}</h3>
            <span class="profile-platform"><i class="fab fa-${conversation.platform || 'whatsapp'}"></i> ${conversation.platform || 'WhatsApp'}</span>
        `;
    }
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return date.toLocaleDateString();
}

// =====================
// AGENTS DATA LOADING
// =====================

async function loadAgents() {
    try {
        const result = await apiRequest('/agents');
        if (result.success) {
            renderAgentsList(result.data);
            renderAgentStats(result.stats);
        }
    } catch (error) {
        console.error('Error loading agents:', error);
    }
}

function renderAgentsList(agents) {
    const grid = document.getElementById('agents-grid');
    if (!grid) return;

    if (!agents || agents.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; padding: 60px 20px; text-align: center;">
                <i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 15px;"></i>
                <p>No agents yet</p>
                <button class="btn btn-primary" onclick="showCreateAgentModal()" style="margin-top: 15px;">
                    <i class="fas fa-plus"></i> Add First Agent
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = agents.map(agent => {
        const permissions = typeof agent.permissions === 'string' ? JSON.parse(agent.permissions) : agent.permissions || {};
        return `
            <div class="agent-card">
                <div class="agent-status ${agent.is_online ? 'online' : 'offline'}"></div>
                <img src="${agent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.first_name + ' ' + agent.last_name)}&background=d4af37&color=fff`}" alt="" class="agent-avatar">
                <h4>${escapeHtml(agent.first_name)} ${escapeHtml(agent.last_name)}</h4>
                <span class="agent-role">${agent.role || 'Agent'}</span>
                <div class="agent-stats">
                    <div class="agent-stat">
                        <span class="stat-num">${agent.active_chats || 0}</span>
                        <span>Active Chats</span>
                    </div>
                </div>
                <div class="agent-permissions">
                    ${permissions.viewAll ? '<span class="perm-badge"><i class="fas fa-eye"></i> View All</span>' : ''}
                    ${permissions.reply ? '<span class="perm-badge"><i class="fas fa-reply"></i> Reply</span>' : ''}
                    ${permissions.assign ? '<span class="perm-badge"><i class="fas fa-user-plus"></i> Assign</span>' : ''}
                </div>
                <div class="agent-actions">
                    <button class="btn btn-secondary btn-sm" onclick="editAgent('${agent.uuid}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAgentStats(stats) {
    if (!stats) return;

    const totalEl = document.getElementById('total-agents');
    const onlineEl = document.getElementById('online-agents');
    const activeEl = document.getElementById('active-agents');

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (onlineEl) onlineEl.textContent = stats.online || 0;
    if (activeEl) activeEl.textContent = stats.active || 0;
}

// =====================
// CHANNELS DATA LOADING
// =====================

async function loadChannels() {
    try {
        const result = await apiRequest('/channels');
        if (result.success) {
            renderChannelsList(result.data, result.stats);
        }
    } catch (error) {
        console.error('Error loading channels:', error);
    }
}

function renderChannelsList(channels, stats) {
    // Render WhatsApp accounts
    const waAccounts = document.getElementById('whatsapp-accounts');
    if (waAccounts) {
        const waChannels = channels.whatsapp || [];
        if (waChannels.length === 0) {
            waAccounts.innerHTML = `
                <div class="empty-state">
                    <i class="fab fa-whatsapp"></i>
                    <p>No accounts connected</p>
                    <span>Click "Connect Account" to add WhatsApp</span>
                </div>
            `;
        } else {
            waAccounts.innerHTML = waChannels.map(ch => `
                <div class="account-item">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(ch.name)}&background=25D366&color=fff" alt="">
                    <div class="account-details">
                        <span class="account-name">${escapeHtml(ch.name)}</span>
                        <span class="account-phone">${ch.phone_number || ch.identifier}</span>
                    </div>
                    <span class="account-status ${ch.status === 'active' ? 'active' : ''}">
                        <i class="fas fa-circle"></i> ${ch.status}
                    </span>
                    <button class="btn-icon danger" onclick="disconnectChannel('${ch.uuid}')" title="Disconnect">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    // Render Facebook accounts
    const fbAccounts = document.getElementById('facebook-accounts');
    if (fbAccounts) {
        const fbChannels = channels.facebook || [];
        if (fbChannels.length === 0) {
            fbAccounts.innerHTML = `
                <div class="empty-state">
                    <i class="fab fa-facebook-messenger"></i>
                    <p>No pages connected</p>
                    <span>Click "Connect Page" to add Messenger</span>
                </div>
            `;
        } else {
            fbAccounts.innerHTML = fbChannels.map(ch => `
                <div class="account-item">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(ch.name)}&background=1877F2&color=fff" alt="">
                    <div class="account-details">
                        <span class="account-name">${escapeHtml(ch.name)}</span>
                    </div>
                    <span class="account-status ${ch.status === 'active' ? 'active' : ''}">
                        <i class="fas fa-circle"></i> ${ch.status}
                    </span>
                    <button class="btn-icon danger" onclick="disconnectChannel('${ch.uuid}')" title="Disconnect">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }

    // Render Instagram accounts
    const igAccounts = document.getElementById('instagram-accounts');
    if (igAccounts) {
        const igChannels = channels.instagram || [];
        if (igChannels.length === 0) {
            igAccounts.innerHTML = `
                <div class="empty-state">
                    <i class="fab fa-instagram"></i>
                    <p>No accounts connected</p>
                    <span>Click "Connect Account" to add Instagram</span>
                </div>
            `;
        } else {
            igAccounts.innerHTML = igChannels.map(ch => `
                <div class="account-item">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(ch.name)}&background=E4405F&color=fff" alt="">
                    <div class="account-details">
                        <span class="account-name">${escapeHtml(ch.name)}</span>
                    </div>
                    <span class="account-status ${ch.status === 'active' ? 'active' : ''}">
                        <i class="fas fa-circle"></i> ${ch.status}
                    </span>
                    <button class="btn-icon danger" onclick="disconnectChannel('${ch.uuid}')" title="Disconnect">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
        }
    }
}

async function disconnectChannel(uuid) {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;

    try {
        const result = await apiRequest(`/channels/${uuid}`, { method: 'DELETE' });
        if (result.success) {
            showToast('Channel disconnected', 'success');
            loadChannels();
        }
    } catch (error) {
        showToast('Failed to disconnect: ' + error.message, 'error');
    }
}

async function connectWhatsApp() {
    try {
        showToast('Initializing WhatsApp...', 'info');

        // Show QR modal immediately with loading state
        showWhatsAppQRModal();

        const result = await apiRequest('/channels/whatsapp/init', { method: 'POST' });
        if (result.success) {
            showToast('Scan QR code with WhatsApp', 'success');
            // If QR code is immediately available, show it
            if (result.data.qrCode) {
                updateWhatsAppQR(result.data.channelId, result.data.qrCode);
            } else {
                // Poll for QR code
                pollWhatsAppQR(result.data.channelId);
            }
        } else {
            closeWhatsAppQR();
            showToast('Failed to initialize WhatsApp', 'error');
        }
    } catch (error) {
        closeWhatsAppQR();
        showToast('Failed to init WhatsApp: ' + error.message, 'error');
    }
}

function showWhatsAppQRModal() {
    let qrModal = document.getElementById('whatsapp-qr-modal');
    if (!qrModal) {
        qrModal = document.createElement('div');
        qrModal.id = 'whatsapp-qr-modal';
        qrModal.className = 'image-preview-modal';
        qrModal.onclick = () => closeWhatsAppQR();
        qrModal.innerHTML = `
            <div class="image-preview-content" onclick="event.stopPropagation()" style="background: var(--bg-primary); border-radius: 16px; padding: 30px; text-align: center; max-width: 400px;">
                <button class="preview-close-btn" onclick="closeWhatsAppQR()">
                    <i class="fas fa-times"></i>
                </button>
                <h3 style="margin-bottom: 20px; color: var(--text-primary);">
                    <i class="fab fa-whatsapp" style="color: #25D366;"></i> Connect WhatsApp
                </h3>
                <div id="whatsapp-qr-container">
                    <div style="width: 250px; height: 250px; margin: 0 auto; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #25D366; margin-bottom: 15px;"></i>
                        <p style="color: var(--text-muted); font-size: 14px;">Generating QR Code...</p>
                        <p style="color: var(--text-muted); font-size: 12px; margin-top: 5px;">This may take a moment</p>
                    </div>
                </div>
                <p style="color: var(--text-muted); margin-top: 20px; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </p>
            </div>
        `;
        document.body.appendChild(qrModal);
    }
    qrModal.classList.remove('hidden');
}

function pollWhatsAppQR(channelId) {
    const pollInterval = setInterval(async () => {
        try {
            const result = await apiRequest(`/channels/whatsapp/${channelId}/qr`);
            if (result.data.status === 'ready') {
                clearInterval(pollInterval);
                showToast('WhatsApp connected!', 'success');
                loadChannels();
            } else if (result.data.qrCode) {
                updateWhatsAppQR(channelId, result.data.qrCode);
            }
        } catch (error) {
            clearInterval(pollInterval);
        }
    }, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(pollInterval), 120000);
}

function updateWhatsAppQR(channelId, qrCode) {
    // Update the QR container content
    const qrContainer = document.getElementById('whatsapp-qr-container');
    if (qrContainer) {
        qrContainer.innerHTML = `
            <img src="${qrCode}" alt="WhatsApp QR Code" style="max-width: 256px; border-radius: 8px; background: white; padding: 10px;">
        `;
    } else {
        // Fallback: create modal if container doesn't exist
        let qrModal = document.getElementById('whatsapp-qr-modal');
        if (!qrModal) {
            showWhatsAppQRModal();
        }
        // Try again after modal is shown
        setTimeout(() => {
            const container = document.getElementById('whatsapp-qr-container');
            if (container) {
                container.innerHTML = `
                    <img src="${qrCode}" alt="WhatsApp QR Code" style="max-width: 256px; border-radius: 8px; background: white; padding: 10px;">
                `;
            }
        }, 100);
    }
}

function closeWhatsAppQR() {
    const qrModal = document.getElementById('whatsapp-qr-modal');
    if (qrModal) {
        qrModal.classList.add('hidden');
    }
}

async function connectFacebook() {
    try {
        const result = await apiRequest('/channels/facebook/oauth-url');
        if (result.success && result.data.oauthUrl) {
            window.open(result.data.oauthUrl, '_blank', 'width=600,height=700');
        }
    } catch (error) {
        showToast('Failed to connect Facebook: ' + error.message, 'error');
    }
}

async function connectInstagram() {
    try {
        const result = await apiRequest('/channels/instagram/oauth-url');
        if (result.success && result.data.oauthUrl) {
            window.open(result.data.oauthUrl, '_blank', 'width=600,height=700');
        }
    } catch (error) {
        showToast('Failed to connect Instagram: ' + error.message, 'error');
    }
}

// =====================
// AGENT MODAL FUNCTIONS
// =====================

function showCreateAgentModal() {
    const modal = document.getElementById('agent-modal');
    const title = document.getElementById('agent-modal-title');
    const submitBtn = document.getElementById('agent-submit-btn');
    const passwordGroup = document.getElementById('agent-password-group');

    if (!modal) return;

    // Reset form
    document.getElementById('agent-form').reset();
    document.getElementById('agent-edit-id').value = '';

    // Set for create mode
    title.innerHTML = '<i class="fas fa-user-plus" style="color: var(--accent-gold);"></i> Add New Agent';
    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Agent';
    if (passwordGroup) passwordGroup.style.display = 'block';
    document.getElementById('agent-password').required = true;

    modal.classList.remove('hidden');
}

function closeAgentModal() {
    const modal = document.getElementById('agent-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function editAgent(agentId) {
    const modal = document.getElementById('agent-modal');
    const title = document.getElementById('agent-modal-title');
    const submitBtn = document.getElementById('agent-submit-btn');
    const passwordGroup = document.getElementById('agent-password-group');

    if (!modal) return;

    try {
        // Fetch agent data
        const result = await apiRequest(`/agents/${agentId}`);
        if (!result.success) {
            showToast('Failed to load agent data', 'error');
            return;
        }

        const agent = result.data;

        // Set for edit mode
        title.innerHTML = '<i class="fas fa-user-edit" style="color: var(--accent-gold);"></i> Edit Agent';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        if (passwordGroup) passwordGroup.style.display = 'block';
        document.getElementById('agent-password').required = false;
        document.getElementById('agent-password').placeholder = 'Leave blank to keep current';

        // Populate form
        document.getElementById('agent-edit-id').value = agentId;
        document.getElementById('agent-first-name').value = agent.first_name || '';
        document.getElementById('agent-last-name').value = agent.last_name || '';
        document.getElementById('agent-email').value = agent.email || '';
        document.getElementById('agent-role').value = agent.role || 'agent';

        // Set permissions
        const perms = typeof agent.permissions === 'string' ? JSON.parse(agent.permissions) : agent.permissions || {};
        document.getElementById('perm-view-all').checked = perms.viewAll || false;
        document.getElementById('perm-reply').checked = perms.reply || false;
        document.getElementById('perm-assign').checked = perms.assign || false;
        document.getElementById('perm-resolve').checked = perms.resolve || false;

        modal.classList.remove('hidden');
    } catch (error) {
        showToast('Error loading agent: ' + error.message, 'error');
    }
}

async function submitAgentForm(event) {
    event.preventDefault();

    const agentId = document.getElementById('agent-edit-id').value;
    const isEdit = !!agentId;

    const permissions = {
        viewAll: document.getElementById('perm-view-all').checked,
        reply: document.getElementById('perm-reply').checked,
        assign: document.getElementById('perm-assign').checked,
        resolve: document.getElementById('perm-resolve').checked
    };

    const data = {
        first_name: document.getElementById('agent-first-name').value,
        last_name: document.getElementById('agent-last-name').value,
        email: document.getElementById('agent-email').value,
        role: document.getElementById('agent-role').value,
        permissions: permissions
    };

    const password = document.getElementById('agent-password').value;
    if (password) {
        data.password = password;
    }

    try {
        const endpoint = isEdit ? `/agents/${agentId}` : '/agents';
        const method = isEdit ? 'PUT' : 'POST';

        const result = await apiRequest(endpoint, method, data);

        if (result.success) {
            showToast(isEdit ? 'Agent updated successfully!' : 'Agent created successfully!', 'success');
            closeAgentModal();
            loadAgents(); // Refresh the agents list
        } else {
            showToast(result.message || 'Failed to save agent', 'error');
        }
    } catch (error) {
        showToast('Error saving agent: ' + error.message, 'error');
    }
}

// Expose functions globally
window.initInboxWebSocket = initInboxWebSocket;
window.openConversation = openConversation;
window.loadInboxData = loadInboxData;
window.loadAgents = loadAgents;
window.loadChannels = loadChannels;
window.disconnectChannel = disconnectChannel;
window.connectWhatsApp = connectWhatsApp;
window.connectFacebook = connectFacebook;
window.connectInstagram = connectInstagram;
window.showCreateAgentModal = showCreateAgentModal;
window.closeAgentModal = closeAgentModal;
window.editAgent = editAgent;
window.submitAgentForm = submitAgentForm;
window.closeWhatsAppQR = closeWhatsAppQR;

