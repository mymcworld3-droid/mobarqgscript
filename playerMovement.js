var PlayerMovement = pc.createScript('playerMovement');

PlayerMovement.attributes.add('speed', { type: 'number', default: 5, title: '最大移動速度' });
PlayerMovement.attributes.add('cameraEntity', { type: 'entity', title: '主要相機' });

PlayerMovement.prototype.initialize = function() {
    this.moveDir = new pc.Vec3();
    this.joystickInput = new pc.Vec2();
    
    // 註冊搖桿監聽器
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

    var currentVelocity = this.entity.rigidbody.linearVelocity;

    if (this.joystickInput.lengthSq() > 0 && this.cameraEntity) {
        
        // 新增：取得搖桿推動的力度，最大限制為 1.0
        var pushStrength = Math.min(this.joystickInput.length(), 1.0);

        var camForward = this.cameraEntity.forward.clone();
        var camRight = this.cameraEntity.right.clone();

        camForward.y = 0;
        camRight.y = 0;
        camForward.normalize();
        camRight.normalize();

        var moveForward = camForward.mulScalar(-this.joystickInput.y);
        var moveRight = camRight.mulScalar(this.joystickInput.x);

        // 每次更新前先歸零
        this.moveDir.set(0, 0, 0);
        this.moveDir.add2(moveForward, moveRight);
        
        if (this.moveDir.lengthSq() > 0.001) {
            // 取得純粹的前進方向
            this.moveDir.normalize();
            
            // 新增：當前的實際速度 = 最大速度 * 搖桿推力
            var currentSpeed = this.speed * pushStrength;
            
            // 設定剛體的線性速度 (套用計算後的實際速度)
            var targetVelocity = new pc.Vec3(
                this.moveDir.x * currentSpeed,
                currentVelocity.y,
                this.moveDir.z * currentSpeed
            );
            this.entity.rigidbody.linearVelocity = targetVelocity;
            
            // 讓角色轉向面向前進方向 (轉向不受力度影響)
            var targetPos = new pc.Vec3().add2(this.entity.getPosition(), this.moveDir);
            this.entity.lookAt(targetPos);
        }
    } else {
        // 放開搖桿時，水平速度歸零
        this.entity.rigidbody.linearVelocity = new pc.Vec3(0, currentVelocity.y, 0);
    }
};