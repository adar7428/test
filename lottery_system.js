class LotterySystem {
    constructor() {
        this.codes = JSON.parse(localStorage.getItem('lotteryCodes')) || [];
        this.usedCodes = JSON.parse(localStorage.getItem('usedCodes')) || [];
        this.ipRecords = JSON.parse(localStorage.getItem('ipRecords')) || {};
        this.prizes = [
            { name: '頭獎 - iPhone 15', probability: 1, color: '#ff4757' },
            { name: '二獎 - iPad', probability: 2, color: '#ff6348' },
            { name: '三獎 - AirPods', probability: 5, color: '#ffa502' },
            { name: '四獎 - 購物金1000元', probability: 10, color: '#ff7675' },
            { name: '五獎 - 購物金500元', probability: 15, color: '#fdcb6e' },
            { name: '六獎 - 購物金200元', probability: 20, color: '#6c5ce7' },
            { name: '銘謝惠顧', probability: 47, color: '#a0a0a0' }
        ];
        this.currentUser = null;
        this.isSpinning = false;
        
        this.init();
    }

    init() {
        this.setupTabs();
        this.setupWheel();
        this.setupEventListeners();
        this.updateDisplay();
        this.getUserIP();
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                tabContents[index].classList.add('active');
            });
        });

        // 預設顯示第一個分頁
        tabBtns[0].classList.add('active');
        tabContents[0].classList.add('active');
    }

    setupWheel() {
        const wheel = document.getElementById('wheel');
        if (!wheel) return;

        const segments = this.prizes.length;
        const segmentAngle = 360 / segments;
        
        let wheelHTML = '';
        this.prizes.forEach((prize, index) => {
            const rotation = segmentAngle * index;
            wheelHTML += `
                <div class="segment" style="
                    position: absolute;
                    width: 50%;
                    height: 50%;
                    transform-origin: right bottom;
                    transform: rotate(${rotation}deg);
                    background: ${prize.color};
                    clip-path: polygon(0 0, 100% 0, 86.6% 50%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                    padding: 10px;
                ">
                    <span style="transform: rotate(-${rotation}deg); font-size: 10px;">
                        ${prize.name}
                    </span>
                </div>
            `;
        });
        
        wheel.innerHTML = wheelHTML;
        wheel.style.position = 'relative';
        wheel.style.overflow = 'hidden';
    }

    setupEventListeners() {
        // 代碼驗證
        const verifyBtn = document.getElementById('verifyCode');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.verifyCode());
        }

        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.verifyCode();
            });
        }

        // 抽獎轉盤
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            spinBtn.addEventListener('click', () => this.spinWheel());
        }

        // 後台管理
        const generateBtn = document.getElementById('generateCode');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateCode());
        }

        const bulkGenerateBtn = document.getElementById('bulkGenerate');
        if (bulkGenerateBtn) {
            bulkGenerateBtn.addEventListener('click', () => this.bulkGenerateCodes());
        }
    }

    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.currentIP = data.ip;
            
            const ipInfo = document.getElementById('currentIP');
            if (ipInfo) {
                ipInfo.textContent = `您的IP: ${this.currentIP}`;
            }
        } catch (error) {
            console.log('無法獲取IP地址');
            this.currentIP = '未知';
        }
    }

    verifyCode() {
        const codeInput = document.getElementById('codeInput');
        const statusDiv = document.getElementById('verificationStatus');
        
        if (!codeInput || !statusDiv) return;

        const code = codeInput.value.trim().toUpperCase();
        
        if (!code) {
            this.showStatus('請輸入抽獎代碼', 'error');
            return;
        }

        // 檢查代碼是否存在
        if (!this.codes.includes(code)) {
            this.showStatus('無效的抽獎代碼', 'error');
            return;
        }

        // 檢查代碼是否已使用
        if (this.usedCodes.includes(code)) {
            this.showStatus('此代碼已經使用過了', 'error');
            return;
        }

        // 檢查IP限制（每個IP每天最多3次）
        const today = new Date().toDateString();
        const ipKey = `${this.currentIP}_${today}`;
        const ipCount = this.ipRecords[ipKey] || 0;

        if (ipCount >= 3) {
            this.showStatus('您今天的抽獎次數已用完（每日限3次）', 'warning');
            return;
        }

        // 驗證成功
        this.currentUser = {
            code: code,
            ip: this.currentIP,
            timestamp: new Date().toISOString()
        };

        this.showStatus('代碼驗證成功！可以開始抽獎', 'success');
        
        // 啟用抽獎按鈕
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            spinBtn.disabled = false;
        }

        codeInput.value = '';
    }

    spinWheel() {
        if (this.isSpinning || !this.currentUser) return;

        this.isSpinning = true;
        const spinBtn = document.getElementById('spinBtn');
        const wheel = document.getElementById('wheel');
        
        if (spinBtn) spinBtn.disabled = true;

        // 根據機率決定獎項
        const prize = this.selectPrize();
        const prizeIndex = this.prizes.findIndex(p => p.name === prize.name);
        
        // 計算目標角度
        const segmentAngle = 360 / this.prizes.length;
        const targetAngle = (segmentAngle * prizeIndex) + (segmentAngle / 2);
        const spinAngle = 360 * 5 + (360 - targetAngle); // 轉5圈後停在目標位置

        if (wheel) {
            wheel.style.transform = `rotate(${spinAngle}deg)`;
        }

        // 3秒後顯示結果
        setTimeout(() => {
            this.showResult(prize);
            this.recordUsage();
            this.isSpinning = false;
        }, 4000);
    }

    selectPrize() {
        const random = Math.random() * 100;
        let cumulative = 0;

        for (const prize of this.prizes) {
            cumulative += prize.probability;
            if (random <= cumulative) {
                return prize;
            }
        }
        
        return this.prizes[this.prizes.length - 1]; // 預設返回最後一個
    }

    showResult(prize) {
        // 創建中獎彈窗
        const modal = document.createElement('div');
        modal.className = 'winner-modal';
        modal.style.display = 'flex';
        
        const isWinner = prize.name !== '銘謝惠顧';
        
        modal.innerHTML = `
            <div class="winner-content">
                <h2 style="color: ${prize.color}; margin-bottom: 20px;">
                    ${isWinner ? '🎉 恭喜中獎！' : '😊 謝謝參與'}
                </h2>
                <div style="font-size: 24px; font-weight: bold; color: #333; margin: 20px 0;">
                    ${prize.name}
                </div>
                <p style="color: #666; margin: 15px 0;">
                    代碼: ${this.currentUser.code}
                </p>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: #4ecdc4; color: white; border: none; 
                               padding: 10px 30px; border-radius: 5px; cursor: pointer;">
                    確定
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);

        // 如果中獎，播放彩帶動畫
        if (isWinner) {
            this.createConfetti();
        }

        // 更新統計資訊
        this.updateStats(prize);
    }

    createConfetti() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = ['#ff4757', '#4ecdc4', '#45b7d1', '#ffa502', '#6c5ce7'][Math.floor(Math.random() * 5)];
            piece.style.animationDelay = Math.random() * 2 + 's';
            confetti.appendChild(piece);
        }
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }

    recordUsage() {
        // 記錄使用過的代碼
        this.usedCodes.push(this.currentUser.code);
        localStorage.setItem('usedCodes', JSON.stringify(this.usedCodes));

        // 記錄IP使用次數
        const today = new Date().toDateString();
        const ipKey = `${this.currentUser.ip}_${today}`;
        this.ipRecords[ipKey] = (this.ipRecords[ipKey] || 0) + 1;
        localStorage.setItem('ipRecords', JSON.stringify(this.ipRecords));

        // 重置當前用戶
        this.currentUser = null;
        
        // 禁用抽獎按鈕
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) spinBtn.disabled = true;
    }

    updateStats(prize) {
        const statsDiv = document.getElementById('drawingStats');
        if (!statsDiv) return;

        const totalDraws = this.usedCodes.length;
        const todayDraws = Object.values(this.ipRecords).reduce((sum, count) => sum + count, 0);

        statsDiv.innerHTML = `
            <h3>🏆 抽獎結果</h3>
            <div style="color: green; font-weight: bold; margin: 10px 0;">
                恭喜獲得：${prize.name}
            </div>
            <div style="margin-top: 15px;">
                <div>📊 統計資訊</div>
                <div>總抽獎次數: ${totalDraws}</div>
                <div>今日抽獎次數: ${todayDraws}</div>
            </div>
        `;
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('verificationStatus');
        if (!statusDiv) return;

        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
    }

    // 後台管理功能
    generateCode() {
        const customCode = document.getElementById('customCode');
        let code;
        
        if (customCode && customCode.value.trim()) {
            code = customCode.value.trim().toUpperCase();
            customCode.value = '';
        } else {
            code = this.randomCode();
        }

        if (this.codes.includes(code)) {
            alert('代碼已存在！');
            return;
        }

        this.codes.push(code);
        localStorage.setItem('lotteryCodes', JSON.stringify(this.codes));
        this.updateCodeList();
    }

    bulkGenerateCodes() {
        const count = parseInt(document.getElementById('bulkCount').value) || 10;
        
        for (let i = 0; i < count; i++) {
            let code;
            do {
                code = this.randomCode();
            } while (this.codes.includes(code));
            
            this.codes.push(code);
        }
        
        localStorage.setItem('lotteryCodes', JSON.stringify(this.codes));
        this.updateCodeList();
        alert(`已生成 ${count} 個代碼！`);
    }

    randomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    updateCodeList() {
        const codeList = document.getElementById('codeList');
        if (!codeList) return;

        codeList.innerHTML = this.codes.map(code => `
            <div class="code-item ${this.usedCodes.includes(code) ? 'used' : ''}">
                <span>${code} ${this.usedCodes.includes(code) ? '(已使用)' : ''}</span>
                <button class="delete-code-btn" onclick="lottery.deleteCode('${code}')">
                    刪除
                </button>
            </div>
        `).join('');
    }

    deleteCode(code) {
        this.codes = this.codes.filter(c => c !== code);
        this.usedCodes = this.usedCodes.filter(c => c !== code);
        localStorage.setItem('lotteryCodes', JSON.stringify(this.codes));
        localStorage.setItem('usedCodes', JSON.stringify(this.usedCodes));
        this.updateCodeList();
    }

    updateDisplay() {
        this.updateCodeList();
        
        // 顯示IP記錄
        const ipList = document.getElementById('ipList');
        if (ipList) {
            const today = new Date().toDateString();
            const todayRecords = Object.entries(this.ipRecords)
                .filter(([key]) => key.includes(today))
                .map(([key, count]) => {
                    const ip = key.split('_')[0];
                    return `<div class="ip-item">${ip}: ${count} 次</div>`;
                }).join('');
            
            ipList.innerHTML = todayRecords || '<div class="ip-item">今日無記錄</div>';
        }
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.lottery = new LotterySystem();
});
