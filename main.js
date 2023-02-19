class PhysicsEngine{
	constructor(){
		this.navclosedPos = -30;
		this.navHeight = 50;
		this.canvasWidth = 500;
		this.canvasHeight = 600;
		this.initWorld();
	}

	initWorld(){
		const engine = Matter.Engine.create();
		const render = Matter.Render.create({
			element: document.body,
			engine: engine
		});

		let bodies = this.createBodies();
		let constraints = this.createConstraints();
		Matter.World.add(engine.world, [...bodies, ...constraints]);

		Matter.Engine.run(engine);
		Matter.Render.run(render);
	}

	createBodies(){
		this.nav = Matter.Bodies.rectangle(this.canvasWidth/2, this.navclosedPos, this.canvasWidth, this.navHeight, {isSensor: true, inertia: Infinity, mass: 0.1});
		this.rope = this.createRope();
		this.handle = this.rope.bodies[this.rope.bodies.length-1];
		return [this.nav, this.rope];
	}

	createRope(){
		const ropeParts = Matter.Body.nextGroup(true);
		const rope = Matter.Composites.stack(this.canvasWidth/2, this.navclosedPos, 8, 1, -30, 0, (x, y) => {
			return Matter.Bodies.circle(x, y, 15, {
				collisionFilter: { group: ropeParts }
			});
		});

		Matter.Composites.chain(rope, 0, 0.2, 0, -0.2, {stiffness: 1, damping: 0.6, length: 3});
		return rope;
	}

	createConstraints(){
		this.fixMenuToTop = Matter.Constraint.create({ 
			bodyA: this.nav,
			pointA: { x: 0, y: this.navHeight/2},
			pointB: { x: this.canvasWidth/2, y: this.navclosedPos},
			stiffness: 0.5,
			damping: 0.1,
			length: 0
		})

		this.fixMenuToBottom = Matter.Constraint.create({ 
			bodyA: this.nav,
			pointA: { x: 0, y: this.navHeight/2},
			pointB: { x: this.canvasWidth/2, y: 0},
			stiffness: 0.01,
			damping: 0.1,
			length: 0
		})

		const fixRopeToMenu = Matter.Constraint.create({ 
			bodyA: this.nav,
			pointA: { x: 0, y: this.navHeight-20 },
			bodyB: this.rope.bodies[0],
			stiffness: 1,
			length: 0
		})	

		this.fixMouseToHandle = Matter.Constraint.create({ 
			bodyA: this.handle,
			pointB:{x: 0, y: 0},
			stiffness: 0.000000000000001,
			length: 0
		}) 

		return [this.fixMenuToTop, this.fixMenuToBottom, fixRopeToMenu, this.fixMouseToHandle];
	}

	grabHandle(x,y){
		this.moveHandle(x,y);
		this.fixMouseToHandle.stiffness = 1;
	}

	moveHandle(x,y){
		this.fixMouseToHandle.pointB.x = x;
		this.fixMouseToHandle.pointB.y = y;
	}

	releaseHandle(){
		this.fixMouseToHandle.stiffness = 0.000000000000001;
	}
}

class Nav{
	constructor(){
		this.physicsEngine = new PhysicsEngine();
		this.canvasWidth = this.physicsEngine.canvasWidth;
		this.canvasHeight = this.physicsEngine.canvasHeight;

		this.navElm = document.getElementById('content');
		this.ropeContainer = document.getElementById('rope');
		this.ropeElm = this.ropeContainer.querySelector('path');
		this.handleElm = document.getElementById('handle');
		this.pullText = document.querySelector('#page > h1');
		for(let link of Array.from(document.querySelectorAll('a'))){
			link.addEventListener('click', e =>{
				e.preventDefault();
				this.navigateTo(link.getAttribute('data-color'));
			})
		}

		this.handleElm.addEventListener('mousedown', this.grab.bind(this));
		document.body.addEventListener('mousemove', this.move.bind(this));
		document.body.addEventListener('mouseup', this.release.bind(this));

		this.handleElm.addEventListener('touchstart', this.grab.bind(this));
		document.body.addEventListener('touchmove', this.move.bind(this), {passive: false});
		document.body.addEventListener('touchend', this.release.bind(this));

		this.grabbed = false;
		this.isOpen = false;
		this.shouldOpen = false;
		this.inTransition = false;

		this.onResize();
		window.addEventListener('resize', this.onResize.bind(this));

		this.render();
	}

	onResize(){
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.ropeContainer.setAttribute('viewport', `0 0 ${this.width} ${this.height}`);
		this.navOpenPos = this.height/10*6;
		this.physicsEngine.fixMenuToBottom.pointB.y = this.getCanvasY(this.navOpenPos);
	}

	grab(e){
		let x = e.clientX || e.touches[0].clientX;
		let y = e.clientY || e.touches[0].clientY;
		this.grabbed = true;
		this.physicsEngine.grabHandle(this.getCanvasX(x), this.getCanvasY(y));
		this.inTransition = false;
		console.log(this.grabbed);
	}

	move(e){
		e.preventDefault();
		
		let x = e.clientX || e.touches[0].clientX;
		let y = e.clientY || e.touches[0].clientY;
		let navPos = this.getScreenY(this.physicsEngine.nav.position.y + this.physicsEngine.navHeight/2)
		if(navPos >= 40 && !this.isOpen && !this.inTransition){
			this.release();
			this.open();
		}
		else if((navPos >= this.navOpenPos + 25 || navPos <= this.navOpenPos - 10) && this.isOpen && !this.inTransition){
			this.release();
			this.close();
			
		}
		else if(this.grabbed)
			this.physicsEngine.moveHandle(this.getCanvasX(x), this.getCanvasY(y));
	}

	release(){
		if(this.grabbed){
			this.physicsEngine.releaseHandle();
			this.grabbed = false;
		}			
	}

	open(){
		this.shouldOpen = true;
		this.inTransition = true;
	}

	close(){
		this.shouldOpen = false;
		this.inTransition = true;
	}

	render(){
		window.requestAnimationFrame(this.render.bind(this));

		if(this.shouldOpen && !this.isOpen){
			if(this.physicsEngine.fixMenuToTop.stiffness >= 0.01){
				this.physicsEngine.fixMenuToTop.stiffness -= 0.02;
				this.physicsEngine.fixMenuToBottom.stiffness += 0.02;
			}
			else
				this.isOpen = true;
		}

		if(!this.shouldOpen && this.isOpen){
			if(this.physicsEngine.fixMenuToTop.stiffness <= 0.5){
				this.physicsEngine.fixMenuToTop.stiffness += 0.03;
				this.physicsEngine.fixMenuToBottom.stiffness -= 0.03;
			}
			else
				this.isOpen = false;
		}

		let path = `M ${this.width/2} ${this.getScreenY(this.physicsEngine.nav.position.y)}`;

		for(let body of this.physicsEngine.rope.bodies){
			path += `L ${this.getScreenX(body.position.x)} ${this.getScreenY(body.position.y)}`;
		}

		let lastBody = this.physicsEngine.rope.bodies[this.physicsEngine.rope.bodies.length - 1];
		this.handleElm.setAttribute('cx', this.getScreenX(lastBody.position.x));
		this.handleElm.setAttribute('cy', this.getScreenY(lastBody.position.y));

		this.ropeElm.setAttribute('d', path);
		//console.log(this.physicsEngine.nav.position.y);
		this.navElm.style.transform = `translate(${0}px, ${this.getScreenY(this.physicsEngine.nav.position.y + this.physicsEngine.navHeight/2)}px)`;
	}

	getScreenX(canvasX){
		return canvasX / this.canvasWidth * this.width;
	}

	getScreenY(canvasY){
		return canvasY / this.canvasHeight * this.height;
	}

	getCanvasX(screenX){
		return screenX / this.width * this.canvasWidth;
	}

	getCanvasY(screenY){
		return screenY / this.height * this.canvasHeight;
	}

	navigateTo(page){
		document.body.style.setProperty('--color', page);
		this.close();
	}
}

const nav = new Nav();