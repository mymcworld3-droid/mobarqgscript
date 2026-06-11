var PlayerMovement = pc.createScript('playerMovement');

PlayerMovement.attributes.add('speed', { type: 'number', default: 5, title: '最大移動速度' });
PlayerMovement.attributes.add('cameraEntity', { type: 'entity', title: '主要相機' });

PlayerMovement.prototype.initialize = function() {
    this.moveDir = new pc.Vec3();
    this.joystickInput = new pc.Vec2();
    
    this.app.on('joystick:move', this.onJoystickMove, this);
    this.app.on('joystick:end', this.onJoystickEnd, this);
};

PlayerMovement.prototype.onJoystickMove = function(x, y) {
    this.joystickInput.set(x, y);
};

PlayerMovement.prototype.onJoystickEnd = function() {
    this.joystickInput.set(0, 0);
};

PlayerMovement.prototype.update = function(dt) {
    if (!this.entity.rigidbody) return;

    this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;

    var currentVelocity = this.entity.rigidbody.linearVelocity;
    
    // 關鍵修正 1：防止 Y 軸重力無限累積導致物理引擎吃掉水平移動速度
    var safeYVelocity = Math.max(currentVelocity.y, -10);

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
            
            var targetVelocity = new pc.Vec3(
                this.moveDir.x * currentSpeed,
                safeYVelocity,
                this.moveDir.z * currentSpeed
            );
            this.entity.rigidbody.linearVelocity = targetVelocity;
            
            var targetPos = new pc.Vec3().add2(this.entity.getPosition(), this.moveDir);
            this.entity.lookAt(targetPos);
            
            // 關鍵修正 2：移除 teleport，不再干擾物理引擎的碰撞結算
        }
    } else {
        // 放開搖桿時，水平速度歸零，但保持安全的 Y 軸速度
        this.entity.rigidbody.linearVelocity = new pc.Vec3(0, safeYVelocity, 0);
    }
};