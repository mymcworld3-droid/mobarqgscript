var AttackButton = pc.createScript('attackButton');

AttackButton.attributes.add('html', { type: 'asset', title: 'HTML' });
AttackButton.attributes.add('css', { type: 'asset', title: 'CSS' });

AttackButton.prototype.initialize = function() {
    var style = document.createElement('style');
    style.innerHTML = this.css.resource || '';
    document.head.appendChild(style);

    this.div = document.createElement('div');
    this.div.innerHTML = this.html.resource || '';
    document.body.appendChild(this.div);

    this.btnZone = document.getElementById('attack-btn-zone');
    this.btn = document.getElementById('attack-btn');
    this.btn.innerText = "普攻";

    this.bindEvents();
};

AttackButton.prototype.bindEvents = function() {
    this.btnZone.addEventListener('touchstart', this.onAttack.bind(this), { passive: false });
    this.btnZone.addEventListener('mousedown', this.onAttack.bind(this));
};

AttackButton.prototype.onAttack = function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 發送技能釋放事件，指定技能 ID 為 basic_attack
    this.app.fire('skill:cast', 'basic_attack');
};