var SkillSystem = pc.createScript('skillSystem');

SkillSystem.attributes.add('configData', { type: 'asset', title: '數值設定檔' });

SkillSystem.prototype.initialize = function() {
    if (this.configData) {
        this.db = this.configData.resource;
    }
    
    this.isCasting = false;
    this.currentClass = 'warrior'; // 實際專案中可動態取得角色目前的職業
};

/**
 * 嘗試釋放技能（外部調用入口，例如點擊技能按鈕）
 */
SkillSystem.prototype.useSkill = function(skillId) {
    if (!this.db || this.isCasting) return;

    var skill = this.db.skills[skillId];
    if (!skill) return;

    // 1. 檢查適合職業
    if (skill.eligible_classes.indexOf(this.currentClass) === -1) {
        console.log("職業不符，無法使用此技能！");
        return;
    }

    this.isCasting = true;
    console.log(`開始釋放技能：${skill.name}（進入前搖：${skill.cast_time} 秒）`);

    // 2. 播放特效（選填檢查）
    if (skill.vfx_effect) {
        this.triggerVfx(skill.vfx_effect);
    }

    // 3. 根據配置檔內各個圖形的 damage_time，安排獨立的傷害判定排程
    for (var i = 0; i < skill.range_shapes.length; i++) {
        var shape = skill.range_shapes[i];
        this.scheduleDamageCheck(skillId, shape);
    }

    // 4. 前搖 + 後搖 結束後恢復自由行動狀態
    var totalDuration = skill.cast_time + skill.recovery_time;
    setTimeout(function() {
        this.isCasting = false;
        console.log(`${skill.name} 技能施放完畢，後搖結束。`);
    }.bind(this), totalDuration * 1000);
};

/**
 * 安排特定時間點的傷害範圍判定
 */
SkillSystem.prototype.scheduleDamageCheck = function(skillId, shape) {
    setTimeout(function() {
        console.log(`觸發範圍判定！形狀: ${shape.shape_type}, 偏移量 Z: ${shape.offset.z}, 時間點: ${shape.damage_time}秒`);
        
        // 在這裡執行碰撞檢測（例如：發射 BoxCast 或 SphereCast）
        // 這裡示範撈取目標並計算傷害
        this.applySkillDamageToTarget(skillId, 'goblin');
    }.bind(this), shape.damage_time * 1000);
};

/**
 * 計算複合屬性傷害並扣除防禦
 */
SkillSystem.prototype.applySkillDamageToTarget = function(skillId, monsterId) {
    var playerStats = this.db.classes[this.currentClass];
    var skill = this.db.skills[skillId];
    var monsterStats = this.db.monsters[monsterId];

    // 遍歷所有屬性加成進行累加 (力量、生命、防禦、精神)
    var rawDamage = 0;
    var scaling = skill.stat_scaling;

    for (var statName in scaling) {
        if (scaling.hasOwnProperty(statName) && playerStats[statName]) {
            rawDamage += playerStats[statName] * scaling[statName];
        }
    }

    // 減去怪物防禦力
    var finalDamage = Math.max(1, rawDamage - monsterStats.defense);
    finalDamage = Math.floor(finalDamage);

    console.log(`對 ${monsterId} 造成了 ${finalDamage} 點傷害！`);
    return finalDamage;
};

/**
 * 特效觸發機制
 */
SkillSystem.prototype.triggerVfx = function(vfxName) {
    console.log(`[特效播放] 呼叫粒子系統或對象池產生: ${vfxName}`);
};