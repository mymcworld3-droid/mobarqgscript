var SkillSystem = pc.createScript('skillSystem');

SkillSystem.attributes.add('configData', { type: 'asset', title: '數值設定檔' });
SkillSystem.attributes.add('playerEntity', { type: 'entity', title: '玩家角色' });
SkillSystem.attributes.add('debugDraw', { type: 'boolean', default: true, title: '顯示攻擊範圍 (Debug)' });

SkillSystem.prototype.initialize = function() {
    if (this.configData) {
        if (typeof this.configData.resource === 'string') {
            this.db = JSON.parse(this.configData.resource);
        } else {
            this.db = this.configData.resource;
        }
    }
    
    this.isCasting = false;
    this.currentClass = 'warrior';
    
    this.debugDrawings = [];
    this.debugColor = new pc.Color(1, 0, 0, 1);
    
    this.app.on('skill:cast', this.useSkill, this);
};

SkillSystem.prototype.useSkill = function(skillId) {
    if (!this.db || this.isCasting) return;

    var skill = this.db.skills[skillId];
    if (!skill) return;

    if (skill.eligible_classes.indexOf(this.currentClass) === -1) {
        console.log("職業不符，無法使用此技能！");
        return;
    }

    this.isCasting = true;
    console.log(`開始釋放技能：${skill.name}`);

    if (skill.vfx_effect) {
        this.triggerVfx(skill.vfx_effect);
    }

    for (var i = 0; i < skill.range_shapes.length; i++) {
        var shape = skill.range_shapes[i];
        this.scheduleDamageCheck(skillId, shape);
    }

    var totalDuration = skill.cast_time + skill.recovery_time;
    setTimeout(function() {
        this.isCasting = false;
    }.bind(this), totalDuration * 1000);
};

SkillSystem.prototype.scheduleDamageCheck = function(skillId, shape) {
    setTimeout(function() {
        if (shape.shape_type === 'fan') {
            this.checkFanCollision(skillId, shape);
        } else {
            console.log(`觸發判定！形狀: ${shape.shape_type}`);
        }
    }.bind(this), shape.damage_time * 1000);
};

SkillSystem.prototype.checkFanCollision = function(skillId, shape) {
    if (!this.playerEntity) return;

    // 關鍵修正 3：加入 .clone()，防止修改到引擎內部共用的向量記憶體
    var playerPos = this.playerEntity.getPosition().clone();
    var playerForward = this.playerEntity.forward.clone();
    
    playerForward.y = 0;
    playerForward.normalize();

    if (this.debugDraw) {
        this.addDebugFan(playerPos.clone(), playerForward.clone(), shape.radius, shape.angle, 0.5);
    }

    var monsters = this.app.root.findByTag('monster');

    for (var i = 0; i < monsters.length; i++) {
        var monster = monsters[i];
        var monsterPos = monster.getPosition();
        
        var dist = playerPos.distance(monsterPos);
        if (dist > shape.radius) continue;

        var dirToMonster = new pc.Vec3().sub2(monsterPos, playerPos);
        dirToMonster.y = 0;
        dirToMonster.normalize();

        var dotProduct = playerForward.dot(dirToMonster);
        var angleRequirement = Math.cos((shape.angle / 2) * pc.math.DEG_TO_RAD);

        if (dotProduct >= angleRequirement) {
            console.log(`扇形範圍命中！目標：${monster.name}`);
            
            if (monster.script && monster.script.monster) {
                var targetId = monster.script.monster.monsterId;
                var finalDamage = this.applySkillDamageToTarget(skillId, targetId);
                monster.script.monster.takeDamage(finalDamage);
            }
        }
    }
};

SkillSystem.prototype.applySkillDamageToTarget = function(skillId, monsterId) {
    var playerStats = this.db.classes[this.currentClass];
    var skill = this.db.skills[skillId];
    var monsterStats = this.db.monsters[monsterId];

    var rawDamage = 0;
    var scaling = skill.stat_scaling;

    for (var statName in scaling) {
        if (scaling.hasOwnProperty(statName) && playerStats[statName]) {
            rawDamage += playerStats[statName] * scaling[statName];
        }
    }

    var finalDamage = Math.max(1, rawDamage - monsterStats.defense);
    finalDamage = Math.floor(finalDamage);

    return finalDamage;
};

SkillSystem.prototype.triggerVfx = function(vfxName) {
    console.log(`[特效播放] 呼叫粒子系統產生: ${vfxName}`);
};

SkillSystem.prototype.addDebugFan = function(center, forward, radius, angle, duration) {
    this.debugDrawings.push({
        type: 'fan',
        center: center,
        forward: forward,
        radius: radius,
        angle: angle,
        timer: duration
    });
};

SkillSystem.prototype.update = function(dt) {
    if (!this.debugDraw || this.debugDrawings.length === 0) return;

    for (var i = this.debugDrawings.length - 1; i >= 0; i--) {
        var dbg = this.debugDrawings[i];
        dbg.timer -= dt;

        if (dbg.timer <= 0) {
            this.debugDrawings.splice(i, 1);
            continue;
        }

        if (dbg.type === 'fan') {
            var center = dbg.center;
            var forward = dbg.forward;
            var radius = dbg.radius;
            var angle = dbg.angle;

            var segments = 20;
            var halfAngle = angle / 2;
            var step = angle / segments;
            var prevPoint = null;

            var drawCenter = new pc.Vec3(center.x, center.y + 0.1, center.z);

            for (var j = 0; j <= segments; j++) {
                var currentAngle = -halfAngle + (step * j);
                
                var q = new pc.Quat().setFromEulerAngles(0, currentAngle, 0);
                var dir = new pc.Vec3();
                q.transformVector(forward, dir);
                
                var arcPoint = new pc.Vec3(
                    drawCenter.x + dir.x * radius,
                    drawCenter.y,
                    drawCenter.z + dir.z * radius
                );

                if (j === 0 || j === segments) {
                    if (this.app.renderLine) {
                        this.app.renderLine(drawCenter, arcPoint, this.debugColor);
                    } else if (this.app.drawLine) {
                        this.app.drawLine(drawCenter, arcPoint, this.debugColor);
                    }
                }

                if (prevPoint) {
                    if (this.app.renderLine) {
                        this.app.renderLine(prevPoint, arcPoint, this.debugColor);
                    } else if (this.app.drawLine) {
                        this.app.drawLine(prevPoint, arcPoint, this.debugColor);
                    }
                }
                prevPoint = arcPoint;
            }
        }
    }
};