// Chat Modal Functionality
class ChatModal {
    constructor() {
        this.modal = document.getElementById('chatModal');
        this.toggleBtn = document.getElementById('chatToggleBtn');
        this.minimizedChat = document.getElementById('minimizedChat');
        this.currentStoreId = null;
        this.stompClient = null;
        this.sentMessageIds = new Set();
        this.totalUnreadCount = 0;
        
        // Kiểm tra các element quan trọng có tồn tại không
        if (!this.modal || !this.toggleBtn) {
            console.error('Chat modal elements not found!');
            return;
        }
        
        console.log('Chat Modal initializing...'); // Debug log
        this.init();
    }
    
    init() {
        try {
            this.bindEvents();
            this.loadStores();
            // Bật lại WebSocket để gửi tin nhắn
            this.connectWebSocket();
            console.log('Chat Modal initialized successfully!'); // Debug log
        } catch (error) {
            console.error('Error initializing chat modal:', error);
        }
    }
    
    bindEvents() {
        try {
            // Toggle button - quan trọng nhất
            if (this.toggleBtn) {
                // Log để debug
                console.log('Toggle button found:', this.toggleBtn);
                console.log('Toggle button display:', window.getComputedStyle(this.toggleBtn).display);
                console.log('Toggle button z-index:', window.getComputedStyle(this.toggleBtn).zIndex);
                console.log('Toggle button pointer-events:', window.getComputedStyle(this.toggleBtn).pointerEvents);
                
                this.toggleBtn.addEventListener('click', (e) => {
                    console.log('Toggle button clicked!', e); // Debug log
                    this.toggleModal();
                }, true); // Thêm capture phase
                
                // Thêm fallback event
                this.toggleBtn.addEventListener('mousedown', () => {
                    console.log('Toggle button mousedown!');
                });
                
                console.log('Toggle button event bound!'); // Debug log
            } else {
                console.error('Toggle button NOT FOUND!');
            }
            
            // Modal controls
            const closeBtn = document.querySelector('.chat-btn-close');
            const minimizeBtn = document.querySelector('.chat-btn-minimize');
            const closeMinimizedBtn = document.querySelector('.btn-close-minimized');
            const restoreBtn = document.querySelector('.btn-restore-chat');
            
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.minimizeModal());
            if (closeMinimizedBtn) closeMinimizedBtn.addEventListener('click', () => this.closeModal());
            if (restoreBtn) restoreBtn.addEventListener('click', () => this.restoreModal());
            
            // Chat functionality
            const sendBtn = document.getElementById('chatSendButton');
            const messageInput = document.getElementById('chatMessageInput');
            
            if (sendBtn) {
                sendBtn.addEventListener('click', () => this.sendMessage());
            }
            
            if (messageInput) {
                messageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });
                
                // Auto-resize textarea
                messageInput.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                });
            }
            
            // File upload
            const fileInput = document.getElementById('chatFileInput');
            const attachBtn = document.querySelector('.btn-attachment');
            
            if (fileInput) {
                fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
            }
            
            if (attachBtn) {
                attachBtn.addEventListener('click', () => {
                    if (fileInput) fileInput.click();
                });
            }
            
            // Store search
            const searchInput = document.getElementById('chatStoreSearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterStores(e.target.value);
                });
            }
        } catch (error) {
            console.error('Error binding events:', error);
        }
    }
    
    toggleModal() {
        console.log('toggleModal called, current display:', this.modal.style.display); // Debug log
        if (this.modal.style.display === 'block') {
            this.closeModal();
        } else {
            this.openModal();
        }
    }
    
    openModal() {
        console.log('Opening modal...'); // Debug log
        this.modal.style.display = 'block';
        if (this.minimizedChat) this.minimizedChat.style.display = 'none';
        this.toggleBtn.style.display = 'none';
    }
    
    closeModal() {
        console.log('Closing modal...'); // Debug log
        this.modal.style.display = 'none';
        if (this.minimizedChat) this.minimizedChat.style.display = 'none';
        this.toggleBtn.style.display = 'flex';
    }
    
    minimizeModal() {
        this.modal.style.display = 'none';
        if (this.minimizedChat) this.minimizedChat.style.display = 'block';
        this.toggleBtn.style.display = 'none';
    }
    
    restoreModal() {
        this.openModal();
    }
    
    async loadStores() {
	    const storeList = document.getElementById('storeList');
	    
	    try {
	        // Hiển thị loading
	        storeList.innerHTML = `
	            <div class="loading-stores">
	                <i class="fa-solid fa-spinner fa-spin"></i>
	                <p>Đang tải cửa hàng...</p>
	            </div>
	        `;

	        const response = await fetch('/chat/api/stores/chat-list', {
	            method: 'GET',
	            credentials: 'include', // Quan trọng: Gửi cookie session
	            headers: {
	                'Content-Type': 'application/json'
	            }
	        });
	        
	        if (response.status === 401) {
	            // Chưa đăng nhập
	            storeList.innerHTML = `
	                <div class="loading-stores" style="color: #667eea;">
	                    <i class="fa-solid fa-user-lock"></i>
	                    <h4>Chưa đăng nhập</h4>
	                    <p>Vui lòng đăng nhập để sử dụng tính năng chat</p>
	                    <a href="/login" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border-radius: 6px; text-decoration: none; display: inline-block;">
	                        Đăng nhập ngay
	                    </a>
	                </div>
	            `;
	            // KHÔNG ẨN nút chat toggle - để user vẫn thấy và biết có tính năng chat
	            // if (this.toggleBtn) {
	            //     this.toggleBtn.style.display = 'none';
	            // }
	            return;
	        }
	        
	        if (!response.ok) {
	            throw new Error(`HTTP error! status: ${response.status}`);
	        }
	        
	        const stores = await response.json();
	        
	        storeList.innerHTML = '';
	        
	        if (!stores || stores.length === 0) {
	            storeList.innerHTML = `
	                <div class="loading-stores">
	                    <i class="fa-solid fa-store-slash"></i>
	                    <p style="margin: 10px 0;">Bạn chưa có tin nhắn nào</p>
	                    <small style="color: #718096;">Hãy liên hệ với cửa hàng để bắt đầu chat</small>
	                </div>
	            `;
	            return;
	        }
	        
	        stores.forEach(store => {
	            const storeItem = this.createStoreItem(store);
	            storeList.appendChild(storeItem);
	        });
	        
	    } catch (error) {
	        console.error('Error loading stores:', error);
	        storeList.innerHTML = `
	            <div class="loading-stores" style="color: #e53e3e;">
	                <i class="fa-solid fa-exclamation-triangle"></i>
	                <p>Không thể tải danh sách cửa hàng</p>
	                <small>Lỗi: ${error.message}</small>
	                <button onclick="window.chatModal.loadStores()" 
	                    style="margin-top: 10px; padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
	                    Thử lại
	                </button>
	            </div>
	        `;
	    }
	}
    
	createStoreItem(store) {
	    const div = document.createElement('div');
	    div.className = 'store-item';
	    div.dataset.storeId = store.maCuaHang;
	    div.dataset.vendorId = store.vendorId; // Thêm vendorId vào data attribute
	    
	    const avatar = store.hinhAnh ? `/uploads/stores/${store.hinhAnh}` : '/images/default-store.png';
	    const lastMessage = store.lastMessage || 'Chưa có tin nhắn';
	    const lastTime = store.lastMessageTime ? this.formatTime(store.lastMessageTime) : '';
	    
	    // Chỉ hiển thị badge khi có tin nhắn chưa đọc
	    const unreadBadge = (store.unreadCount && store.unreadCount > 0) ? 
	        `<span class="unread-count">${store.unreadCount}</span>` : '';
	    
	    div.innerHTML = `
	        <img src="${avatar}" alt="${store.tenCuaHang}" class="store-avatar" 
	             onerror="this.src='/images/default-store.png'">
	        <div class="store-info">
	            <div class="store-name">${store.tenCuaHang}</div>
	            <div class="last-message">${lastMessage}</div>
	            <div class="store-meta">
	                <div class="store-time">${lastTime}</div>
	                ${unreadBadge}
	            </div>
	        </div>
	    `;
	    
	    div.addEventListener('click', () => {
	        this.selectStore(store);
	    });
	    
	    return div;
	}
    
    selectStore(store) {
        this.currentStoreId = store.maCuaHang;
        
        // Update active state
        document.querySelectorAll('.store-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-store-id="${store.maCuaHang}"]`).classList.add('active');
        
        // Update UI
        document.getElementById('noStoreSelected').style.display = 'none';
        document.getElementById('chatActiveArea').style.display = 'flex';
        
        // Update store info
        document.getElementById('currentStoreName').textContent = store.tenCuaHang;
        document.getElementById('currentStoreAvatar').src = store.hinhAnh ? 
            `/uploads/stores/${store.hinhAnh}` : '/images/default-store.png';
        document.getElementById('typingStoreName').textContent = store.tenCuaHang;
        document.getElementById('minimizedStoreName').textContent = store.tenCuaHang;
        
        // Load chat history
        this.loadChatHistory(store.maCuaHang);
        
        // Clear unread count for this store
        this.clearStoreUnread(store.maCuaHang);
    }
    
    async loadChatHistory(storeId) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '<div class="loading-stores"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải tin nhắn...</div>';
        
        try {
            const response = await fetch(`/chat/history/${storeId}/vendor`, {
                method: 'GET',
                credentials: 'include', // Quan trọng: Gửi cookie session
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const messages = await response.json();
            
            chatMessages.innerHTML = '';
            
            if (!messages || messages.length === 0) {
                chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <i class="fa-solid fa-comments"></i>
                        <h4>Bắt đầu cuộc trò chuyện</h4>
                        <p>Chào bạn! Chúng tôi có thể giúp gì cho bạn?</p>
                    </div>
                `;
            } else {
                messages.forEach(message => {
                    this.displayMessage(message, false);
                });
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            chatMessages.innerHTML = '<div class="loading-stores" style="color: #e53e3e;">Không thể tải tin nhắn. Lỗi: ' + error.message + '</div>';
        }
    }
    
    displayMessage(message, animate = true) {
        const chatMessages = document.getElementById('chatMessages');
        const isSent = message.maNguoiGui === this.getCurrentUserId();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        if (animate) {
            messageDiv.style.animation = 'messageSlideIn 0.3s ease';
        }
        
        const time = new Date(message.thoiGian);
        const timeString = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        let contentHtml = '';
        
        // Kiểm tra nếu là file
        if (message.type === 'file' && message.fileUrl) {
            const fileUrl = `/files/uploads/chats/${message.fileUrl}`;
            const fileName = message.noiDung || message.fileUrl;
            const fileExtension = fileName.toLowerCase().split('.').pop();
            
            // Kiểm tra loại file
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension)) {
                // Hiển thị hình ảnh
                contentHtml = `
                    <div class="message-bubble file-message">
                        <div class="file-preview image-preview">
                            <img src="${fileUrl}" alt="${fileName}" class="chat-image" 
                                 onclick="window.open('${fileUrl}', '_blank')"
                                 style="max-width: 250px; max-height: 250px; border-radius: 8px; cursor: pointer;">
                        </div>
                        <div class="file-info">
                            <i class="fa-solid fa-image"></i>
                            <span class="file-name">${fileName}</span>
                        </div>
                    </div>
                `;
            } else if (['mp4', 'webm', 'ogg', 'mov'].includes(fileExtension)) {
                // Hiển thị video
                contentHtml = `
                    <div class="message-bubble file-message">
                        <div class="file-preview video-preview">
                            <video controls style="max-width: 250px; max-height: 250px; border-radius: 8px;">
                                <source src="${fileUrl}" type="video/${fileExtension}">
                                Trình duyệt không hỗ trợ video.
                            </video>
                        </div>
                        <div class="file-info">
                            <i class="fa-solid fa-video"></i>
                            <span class="file-name">${fileName}</span>
                        </div>
                    </div>
                `;
            } else if (fileExtension === 'pdf') {
                // Hiển thị PDF với link download
                contentHtml = `
                    <div class="message-bubble file-message">
                        <div class="file-preview pdf-preview">
                            <a href="${fileUrl}" target="_blank" class="pdf-link">
                                <i class="fa-solid fa-file-pdf" style="font-size: 48px; color: #e53e3e;"></i>
                                <div class="pdf-info">
                                    <span class="file-name">${fileName}</span>
                                    <span class="view-text">Nhấn để xem PDF</span>
                                </div>
                            </a>
                        </div>
                    </div>
                `;
            } else {
                // File khác - hiển thị link download
                contentHtml = `
                    <div class="message-bubble file-message">
                        <div class="file-preview generic-file">
                            <a href="${fileUrl}" download="${fileName}" class="file-download-link">
                                <i class="fa-solid fa-file" style="font-size: 48px; color: #667eea;"></i>
                                <div class="file-download-info">
                                    <span class="file-name">${fileName}</span>
                                    <span class="download-text">Nhấn để tải xuống</span>
                                </div>
                            </a>
                        </div>
                    </div>
                `;
            }
        } else {
            // Tin nhắn text bình thường
            contentHtml = `<div class="message-bubble">${message.noiDung}</div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${contentHtml}
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
    }
    
    sendMessage() {
        if (!this.currentStoreId) {
            this.showToast('Vui lòng chọn cửa hàng để chat', 'error');
            return;
        }
        
        const messageInput = document.getElementById('chatMessageInput');
        const messageContent = messageInput.value.trim();
        
        if (messageContent === '' || !this.stompClient) {
            return;
        }
        
        const chatMessage = {
            maNguoiGui: this.getCurrentUserId(),
            maNguoiNhan: this.getVendorId(this.currentStoreId),
            maCuaHang: this.currentStoreId,
            noiDung: messageContent,
            thoiGian: new Date(),
            type: 'text'
        };
        
        // Display message immediately
        this.displayMessage(chatMessage, true);
        this.scrollToBottom();
        
        // Send via WebSocket
        this.stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        messageInput.focus();
    }
    
    connectWebSocket() {
        try {
            const socket = new SockJS('/ws');
            this.stompClient = Stomp.over(socket);
            
            this.stompClient.connect({}, (frame) => {
                console.log('Chat Modal WebSocket Connected');
                
                const userId = this.getCurrentUserId();
                if (!userId) {
                    console.error('No user ID found');
                    return;
                }
                
                // Subscribe to messages
                this.stompClient.subscribe(`/user/${userId}/queue/messages`, (message) => {
                    const chatMessage = JSON.parse(message.body);
                    this.handleIncomingMessage(chatMessage);
                });
                
                // Subscribe to typing notifications
                this.stompClient.subscribe(`/user/${userId}/queue/typing`, (message) => {
                    const typingInfo = JSON.parse(message.body);
                    this.showTypingIndicator(typingInfo.isTyping);
                });
                
            }, (error) => {
                console.error('WebSocket connection error:', error);
                setTimeout(() => this.connectWebSocket(), 5000);
            });
        } catch (error) {
            console.error('Error connecting WebSocket:', error);
        }
    }
    
    handleIncomingMessage(chatMessage) {
        const msgId = chatMessage.maTinNhan || `${chatMessage.maNguoiGui}-${Date.now()}`;
        
        if (this.sentMessageIds.has(msgId)) {
            return;
        }
        
        // If message is for current store, display it
        if (this.currentStoreId && chatMessage.maCuaHang === this.currentStoreId) {
            this.displayMessage(chatMessage, true);
            this.scrollToBottom();
            this.sentMessageIds.add(msgId);
        }
        
        // Update unread count
        if (chatMessage.maNguoiGui !== this.getCurrentUserId()) {
            this.incrementUnreadCount();
            this.updateStoreUnread(chatMessage.maCuaHang);
        }
    }
    
    showTypingIndicator(show) {
        const typingIndicator = document.getElementById('typingIndicator');
        typingIndicator.style.display = show ? 'block' : 'none';
        if (show) {
            this.scrollToBottom();
        }
    }
    
    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!this.currentStoreId) {
            this.showToast('Vui lòng chọn cửa hàng để gửi file', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch('/files/api/upload/chat', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                const chatMessage = {
                    maNguoiGui: this.getCurrentUserId(),
                    maNguoiNhan: this.getVendorId(this.currentStoreId),
                    maCuaHang: this.currentStoreId,
                    noiDung: file.name,
                    fileUrl: data.fileName,
                    thoiGian: new Date(),
                    type: 'file'
                };
                
                this.stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
                this.showToast('Upload file thành công', 'success');
            } else {
                this.showToast('Upload file thất bại', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Không thể upload file', 'error');
        }
        
        event.target.value = '';
    }
    
    filterStores(keyword) {
        const storeItems = document.querySelectorAll('.store-item');
        const searchTerm = keyword.toLowerCase();
        
        storeItems.forEach(item => {
            const storeName = item.querySelector('.store-name').textContent.toLowerCase();
            if (storeName.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    incrementUnreadCount() {
        this.totalUnreadCount++;
        this.updateUnreadBadge();
    }
    
    updateUnreadBadge() {
        const badge = document.getElementById('chatUnreadBadge');
        const minimizedBadge = document.getElementById('minimizedUnread');
        const minimizedCount = document.getElementById('minimizedUnreadCount');
        
        if (this.totalUnreadCount > 0) {
            badge.textContent = this.totalUnreadCount;
            badge.style.display = 'block';
            
            minimizedCount.textContent = this.totalUnreadCount;
            minimizedBadge.style.display = 'block';
            
            // Update page title
            const originalTitle = document.title.replace(/^\(\d+\)\s*/, '');
            document.title = `(${this.totalUnreadCount}) ${originalTitle}`;
        } else {
            badge.style.display = 'none';
            minimizedBadge.style.display = 'none';
            document.title = document.title.replace(/^\(\d+\)\s*/, '');
        }
    }
    
    updateStoreUnread(storeId) {
        const storeItem = document.querySelector(`[data-store-id="${storeId}"]`);
        if (storeItem) {
            let unreadCount = storeItem.querySelector('.unread-count');
            const newCount = unreadCount ? parseInt(unreadCount.textContent) + 1 : 1;
            
            if (unreadCount) {
                // Cập nhật số lượng
                unreadCount.textContent = newCount;
            } else {
                // Tạo badge mới nếu chưa có
                const storeMeta = storeItem.querySelector('.store-meta');
                if (storeMeta) {
                    const badge = document.createElement('span');
                    badge.className = 'unread-count';
                    badge.textContent = newCount;
                    storeMeta.appendChild(badge);
                }
            }
        }
    }
    
    clearStoreUnread(storeId) {
        const storeItem = document.querySelector(`[data-store-id="${storeId}"]`);
        if (storeItem) {
            const unreadCount = storeItem.querySelector('.unread-count');
            if (unreadCount) {
                // Xóa badge thay vì set về 0
                unreadCount.remove();
            }
        }
    }
    
    scrollToBottom() {
        const container = document.querySelector('.chat-messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    formatTime(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Vừa xong';
        if (minutes === 1) return '1 phút trước';
        if (hours < 1) return `${minutes} phút trước`;
        if (hours === 1) return '1 giờ trước';
        if (days < 1) return `${hours} giờ trước`;
        if (days === 1) return 'Hôm qua';
        
        return date.toLocaleDateString('vi-VN');
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            border-left: 4px solid ${type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : '#667eea'};
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    getCurrentUserId() {
        const currentUserIdInput = document.getElementById('currentUserId');
        if (currentUserIdInput) {
            const userId = parseInt(currentUserIdInput.value);
            return userId > 0 ? userId : null;
        }
        
        const userData = localStorage.getItem('userData');
        if (userData) {
            const user = JSON.parse(userData);
            return user.maNguoiDung;
        }
        
        console.error('Không tìm thấy thông tin người dùng');
        return null;
    }
    
    getVendorId(storeId) {
        const storeItem = document.querySelector(`[data-store-id="${storeId}"]`);
        return storeItem ? parseInt(storeItem.dataset.vendorId) : null;
    }
}

// Initialize chat modal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing chat modal...'); // Debug log
    try {
        window.chatModal = new ChatModal();
        console.log('Chat modal created:', window.chatModal); // Debug log
    } catch (error) {
        console.error('Failed to create chat modal:', error);
    }
});