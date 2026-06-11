var Monster = pc.createScript('monster');

Monster.attributes.add('monsterId', { type: 'string', default: 'goblin', title: '怪物 ID' });
Monster.attributes.add('configData', { type: 'asset', title: '數值設定檔' });
Monster.attributes.add('cameraEntity', { type: 'entity', title: '主要相機' });
Monster.attributes.add('hpBarHeight', { type: 'number', default: 2.2, title: '血條高度偏移' });

Monster.prototype.initialize = function() {
    if (this.configData) {
        if (typeof this.configData.resource === 'string') {
            this.db = JSON.parse(this.configData.resource);
        } else {
            this.db = this.configData.resource;
        }

        var stats = this.db.monsters[this.monsterId];
        if (stats) {
            this.hp = stats.hp;
            this.maxHp = stats.hp;
        } else {
            this.hp = 100;
            this.maxHp = 100;
        }
    }

    this.createHpBar();
};

Monster.prototype.createHpBar = function() {
    // 1. 動態注入血條的 CSS 樣式 (若場景中有多隻怪，此樣式只會注入一次)
    if (!document.getElementById('hp-bar-style')) {
        var style = document.createElement('style');
        style.id = 'hp-bar-style';
        style.innerHTML = `
            .hp-bar-bg {
                position: absolute;
                width: 60px;
                height: 6px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.8);
                border-radius: 3px;
                pointer-events: none;
                transform: translate(-50%, -50%);
                z-index: 5;
                display: none;
            }
            .hp-bar-fill {
                width: 100%;
                height: 100%;
                background-color: #ff3333;
                border-radius: 2px;
                transition: width 0.1s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. 建立血條的 DOM 結構
    this.hpBg = document.createElement('div');
    this.hpBg.className = 'hp-bar-bg';
    
    this.hpFill = document.createElement('div');
    this.hpFill.className = 'hp-bar-fill';
    
    this.hpBg.appendChild(this.hpFill);
    document.body.appendChild(this.hpBg);

    // 預配置向量，避免在 update 中重複 new 造成記憶體回收負擔
    this.screenPos = new pc.Vec3();
    this.monsterPos = new pc.Vec3();

    // 3. 安全機制：確保此 Entity 被刪除時，對應的 HTML 血條也會被拔除
    this.on('destroy', function() {
        if (this.hpBg && this.hpBg.parentNode) {
            this.hpBg.parentNode.removeChild(this.hpBg);
        }
    }, this);
};

Monster.prototype.update = function(dt) {
    if (!this.cameraEntity || !this.hpBg) return;

    // 取得當前怪物在 3D 世界的位置，並向上延伸到頭頂
    this.monsterPos.copy(this.entity.getPosition());
    this.monsterPos.y += this.hpBarHeight;

    // 將 3D 世界座標投影轉換至 2D 螢幕座標
    var cameraComponent = this.cameraEntity.camera;
    cameraComponent.worldToScreen(this.monsterPos, this.screenPos);

    // screenPos.z > 0 代表目標確實在相機鏡頭的前方（非轉向身後）
    if (this.screenPos.z > 0) {
        this.hpBg.style.display = 'block';
        this.hpBg.style.left = this.screenPos.x + 'px';
        this.hpBg.style.top = this.screenPos.y + 'px';
    } else {
        this.hpBg.style.display = 'none';
    }
};

Monster.prototype.takeDamage = function(damage) {
    this.hp -= damage;
    console.log(`[${this.entity.name}] 受到 ${damage} 點傷害！剩餘血量: ${this.hp}`);

    // 計算當前血量百分比並更新 CSS 寬度
    var hpPercent = Math.max(0, this.hp / this.maxHp) * 100;
    if (this.hpFill) {
        this.hpFill.style.width = hpPercent + '%';
    }

    if (this.hp <= 0) {
        this.die();
    }
};

Monster.prototype.die = function() {
    console.log(`[${this.entity.name}] 死亡！`);
    
    // 死亡時立即拔除血條 UI，避免殘留
    if (this.hpBg && this.hpBg.parentNode) {
        this.hpBg.parentNode.removeChild(this.hpBg);
        this.hpBg = null;
    }
    
    setTimeout(function() {
        this.entity.destroy();
    }.bind(this), 100);
};