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
        'settings': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[pageId] || pageId;

    // Load page data
    loadPageData(pageId);
}

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

    // Generate content for each platform individually
    for (const platform of platforms) {
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
                        <div class="post-image-overlay">
                            <button class="regenerate-btn" onclick="showRegeneratePopup('${platform}', '${data.imageUrl}')">
                                <i class="fas fa-sync-alt"></i> Regenerate
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

        } catch (error) {
            clearInterval(progressInterval);
            card.classList.remove('generating');
            card.classList.add('error');
            card.querySelector('.post-status').innerHTML = '<i class="fas fa-exclamation-circle"></i> Error';
            card.querySelector('.post-text').textContent = error.message || 'Generation failed';
            console.error(`Failed to generate ${platform}:`, error);
        }
    }

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
    try {
        const response = await apiRequest('/social/posts?limit=12');
        const container = document.getElementById('posts-history');

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
    if (!window.generatedPosts) return;

    showLoading();
    const topic = document.getElementById('social-topic').value;
    const platforms = Object.keys(window.generatedPosts).filter(p => window.generatedPosts[p]?.content);

    try {
        await apiRequest('/social/generate-and-create', {
            method: 'POST',
            body: JSON.stringify({
                topic,
                platforms,
                tone: document.getElementById('social-tone').value
            })
        });
        showToast('All posts saved as drafts!', 'success');
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
        document.querySelector('.sidebar').classList.toggle('open');
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

async function loadSavedPosts() {
    const grid = document.getElementById('saved-posts-grid');
    if (!grid) return;

    try {
        const response = await apiRequest('/social/posts');
        const posts = response.data || [];

        if (posts.length === 0) {
            grid.innerHTML = '<p class="empty-state">No saved posts yet. Generate some posts first!</p>';
            return;
        }

        const platformIcons = {
            instagram: 'fa-instagram',
            facebook: 'fa-facebook',
            twitter: 'fa-x-twitter',
            linkedin: 'fa-linkedin'
        };

        grid.innerHTML = posts.map(post => `
            <div class="social-post-card" data-platform="${post.platform}">
                <div class="platform-header ${post.platform}">
                    <i class="fab ${platformIcons[post.platform] || 'fa-share-alt'}"></i>
                    <span>${(post.platform || 'unknown').charAt(0).toUpperCase() + (post.platform || '').slice(1)}</span>
                    <span class="post-date">${new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                ${post.image_url ? `<div class="post-image"><img src="${post.image_url}" alt="" onerror="this.parentElement.remove()"></div>` : ''}
                <div class="post-content">
                    <div class="post-text">${post.content || ''}</div>
                </div>
                <div class="post-actions">
                    <button class="btn btn-secondary btn-sm" onclick="copyToClipboard('${encodeURIComponent(post.content || '')}')">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                    ${post.image_url ? `<button class="btn btn-primary btn-sm" onclick="window.open('${post.image_url}')">
                        <i class="fas fa-download"></i> View
                    </button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        grid.innerHTML = '<p class="empty-state">Failed to load posts</p>';
        console.error('Failed to load saved posts:', error);
    }
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

    try {
        const response = await apiRequest('/uploads/list?folder=social');
        const files = response.data || [];

        if (files.length === 0) {
            grid.innerHTML = '<p class="empty-state">No media files yet. Generate some posts with images first!</p>';
            return;
        }

        grid.innerHTML = files.map(file => `
            <div class="media-item">
                <img src="${file.url}" alt="${file.name}" onclick="showImagePreview('${file.url}')">
                <div class="media-overlay">
                    <span class="media-name">${file.name}</span>
                    <div class="media-actions">
                        <button onclick="window.open('${file.url}')" title="View"><i class="fas fa-expand"></i></button>
                        <button onclick="downloadFile('${file.url}', '${file.name}')" title="Download"><i class="fas fa-download"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        // Fallback: try to list from social folder directly
        grid.innerHTML = '<p class="empty-state">Failed to load media. Check uploads/social folder.</p>';
        console.error('Failed to load media:', error);
    }
}

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
