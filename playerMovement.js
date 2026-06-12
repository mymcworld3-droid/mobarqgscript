var PlayerMovement = pc.createScript('playerMovement');

PlayerMovement.attributes.add('speed', { type: 'number', default: 5, title: '最大移動速度' });
PlayerMovement.attributes.add('cameraEntity', { type: 'entity', title: '主要相機' });

PlayerMovement.prototype.initialize = function() {
    this.moveDir = new pc.Vec3();
    this.joystickInput = new pc.Vec2();
    
    // 衝刺用變數
    this.dashTimer = 0;
    this.dashVelocity = new pc.Vec3();

    // 鎖定物理旋轉：將角速度影響因子設為 0，徹底防止撞擊怪物或牆壁產生的外力擺動
    if (this.entity.rigidbody) {
        this.entity.rigidbody.angularFactor = pc.Vec3.ZERO;
    }

    this.app.on('joystick:move', this.onJoystickMove, this);
    this.app.on('joystick:end', this.onJoystickEnd, this);
    this.app.on('player:dash', this.onDash, this);
};

PlayerMovement.prototype.onDash = function(forward, speed, duration) {
    this.dashTimer = duration;
    this.dashVelocity.copy(forward).mulScalar(speed);
};

PlayerMovement.prototype.onJoystickMove = function(x, y) {
    this.joystickInput.set(x, y);
};

PlayerMovement.prototype.onJoystickEnd = function() {
    this.joystickInput.set(0, 0);
};

PlayerMovement.prototype.update = function(dt) {
    if (!this.entity.rigidbody) return;

    var currentVelocity = this.entity.rigidbody.linearVelocity;
    var safeYVelocity = Math.max(currentVelocity.y, -10);

    // 優先處理技能衝刺
    if (this.dashTimer > 0) {
        this.dashTimer -= dt;
        this.entity.rigidbody.linearVelocity = new pc.Vec3(
            this.dashVelocity.x,
            safeYVelocity,
            this.dashVelocity.z
        );
        return; // 跳過搖桿控制
    }

    if (this.joystickInput.lengthSq() > 0 && this.cameraEntity) {
        
        var pushStrength = Math.min(this.joystickInput.length(), 1.0);

        var camForward = this.cameraEntity.forward.clone();
        var camRight = this.cameraEntity.right.clone();

        camForward.y = 0;
        camRight.y = 0;
        camForward.normalize();
        camRight.normalize();

        var moveForward = camForward.mulScalar(-this.joystickInput.y);
        var moveRight = camRight.mulScalar(this.joystickInput.x);

        this.moveDir.set(0, 0, 0);
        this.moveDir.add2(moveForward, moveRight);
        
        if (this.moveDir.lengthSq() > 0.001) {
            this.moveDir.normalize();
            
            var currentSpeed = this.speed * pushStrength;
            
            var targetPos = new pc.Vec3().add2(this.entity.getPosition(), this.moveDir);
            this.entity.lookAt(targetPos);
            
            // 使用 syncEntityToBody 取代 teleport，只同步方向而不清空物理動能，解決越走越慢的問題
            this.entity.rigidbody.syncEntityToBody();
            
            var targetVelocity = new pc.Vec3(
                this.moveDir.x * currentSpeed,
                safeYVelocity,
                this.moveDir.z * currentSpeed
            );
            this.entity.rigidbody.linearVelocity = targetVelocity;
        }
    } else {
        this.entity.rigidbody.linearVelocity = new pc.Vec3(0, safeYVelocity, 0);
    }
};
