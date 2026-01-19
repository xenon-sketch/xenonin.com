
(function () {
    const container = document.getElementById("picoz3DContainer");
    const canvas = document.getElementById("picoz3DCanvas");

    if (!container || !canvas) {
        console.warn("Pico Z 3D container or canvas not found");
        return;
    }

    // --- Simplex Noise Implementation (Minimal) ---
    // Ported from standard open source implementations for standalone use
    const SimplexNoise = (function () {
        var F3 = 1.0 / 3.0;
        var G3 = 1.0 / 6.0;
        var p = new Uint8Array([151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180]);
        var perm = new Uint8Array(512);
        var permMod12 = new Uint8Array(512);
        for (var i = 0; i < 512; i++) {
            perm[i] = p[i & 255];
            permMod12[i] = perm[i] % 12;
        }

        return {
            noise3D: function (xin, yin, zin) {
                var n0, n1, n2, n3;
                var s = (xin + yin + zin) * F3;
                var i = Math.floor(xin + s);
                var j = Math.floor(yin + s);
                var k = Math.floor(zin + s);
                var t = (i + j + k) * G3;
                var X0 = i - t;
                var Y0 = j - t;
                var Z0 = k - t;
                var x0 = xin - X0;
                var y0 = yin - Y0;
                var z0 = zin - Z0;
                var i1, j1, k1, i2, j2, k2;
                if (x0 >= y0) {
                    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
                    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
                    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
                } else {
                    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
                    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
                    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
                }
                var x1 = x0 - i1 + G3;
                var y1 = y0 - j1 + G3;
                var z1 = z0 - k1 + G3;
                var x2 = x0 - i2 + 2.0 * G3;
                var y2 = y0 - j2 + 2.0 * G3;
                var z2 = z0 - k2 + 2.0 * G3;
                var x3 = x0 - 1.0 + 3.0 * G3;
                var y3 = y0 - 1.0 + 3.0 * G3;
                var z3 = z0 - 1.0 + 3.0 * G3;
                var ii = i & 255;
                var jj = j & 255;
                var kk = k & 255;
                var gi0 = permMod12[ii + perm[jj + perm[kk]]];
                var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
                var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
                var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
                var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
                if (t0 < 0) n0 = 0.0;
                else {
                    t0 *= t0;
                    n0 = t0 * t0 * dot(gi0, x0, y0, z0);
                }
                var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
                if (t1 < 0) n1 = 0.0;
                else {
                    t1 *= t1;
                    n1 = t1 * t1 * dot(gi1, x1, y1, z1);
                }
                var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
                if (t2 < 0) n2 = 0.0;
                else {
                    t2 *= t2;
                    n2 = t2 * t2 * dot(gi2, x2, y2, z2);
                }
                var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
                if (t3 < 0) n3 = 0.0;
                else {
                    t3 *= t3;
                    n3 = t3 * t3 * dot(gi3, x3, y3, z3);
                }
                return 32.0 * (n0 + n1 + n2 + n3);
            }
        };

        function dot(g, x, y, z) {
            var grad = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
            return grad[g][0] * x + grad[g][1] * y + grad[g][2] * z;
        }
    })();

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a1a1a, 0.05);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);
    particlesGroup.position.y = 0.5;

    // --- Geometry ---
    const TOTAL_PARTICLES = 18000; // slightly reduced for fluid performance on CPU
    const positions = new Float32Array(TOTAL_PARTICLES * 3);
    const colors = new Float32Array(TOTAL_PARTICLES * 3);
    const sizes = new Float32Array(TOTAL_PARTICLES);
    const originalPositions = new Float32Array(TOTAL_PARTICLES * 3);
    const velocities = new Float32Array(TOTAL_PARTICLES * 3);
    const randomness = new Float32Array(TOTAL_PARTICLES * 3); // Per-particle noise offset

    // Colors - Sand
    const colorPrimary = new THREE.Color(0xe1bf92);
    const colorSecondary = new THREE.Color(0xd4a373);
    const colorHighlight = new THREE.Color(0xfefae0);

    // Spine Curve
    const curvePoints = [
        new THREE.Vector3(-0.9, 1.2, 0),
        new THREE.Vector3(-0.5, 1.8, 0),
        new THREE.Vector3(0.5, 1.8, 0),
        new THREE.Vector3(0.9, 1.2, 0),
        new THREE.Vector3(0.4, 0.2, 0),
        new THREE.Vector3(0.0, -0.6, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);

    // Spawn Particles
    let pIndex = 0;
    const hookParticles = Math.floor(TOTAL_PARTICLES * 0.8);

    function spawn(iCount, getPosFunc) {
        for (let i = 0; i < iCount; i++) {
            const pos = getPosFunc();
            const idx = pIndex * 3;

            positions[idx] = pos.x;
            positions[idx + 1] = pos.y;
            positions[idx + 2] = pos.z;

            originalPositions[idx] = pos.x;
            originalPositions[idx + 1] = pos.y;
            originalPositions[idx + 2] = pos.z;

            // Random Noise Offset
            randomness[idx] = Math.random() * 100;
            randomness[idx + 1] = Math.random() * 100;
            randomness[idx + 2] = Math.random() * 100;

            const rand = Math.random();
            let c = (rand > 0.9) ? colorHighlight : (rand > 0.4 ? colorPrimary : colorSecondary);
            c = c.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);

            colors[idx] = c.r;
            colors[idx + 1] = c.g;
            colors[idx + 2] = c.b;

            sizes[pIndex] = (Math.random() * 0.05 + 0.02);
            pIndex++;
        }
    }

    // Hook
    spawn(hookParticles, () => {
        const t = Math.random();
        const pt = curve.getPoint(t);
        const r = 0.25 * Math.sqrt(Math.random());
        const th = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
            pt.x + r * Math.cos(th),
            pt.y + r * Math.sin(th) * 0.2 + (Math.random() - 0.5) * 0.15,
            pt.z + r * Math.sin(th)
        );
    });

    // Dot
    const dotCenter = new THREE.Vector3(0, -1.8, 0);
    spawn(TOTAL_PARTICLES - hookParticles, () => {
        const r = 0.3 * Math.pow(Math.random(), 1 / 3);
        const th = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return new THREE.Vector3(
            dotCenter.x + r * Math.sin(phi) * Math.cos(th),
            dotCenter.y + r * Math.sin(phi) * Math.sin(th),
            dotCenter.z + r * Math.cos(phi)
        );
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(geometry, material);
    particlesGroup.add(particleSystem);

    // Dust
    const dustCount = 400;
    const dustPos = [];
    const dustCol = [];
    for (let i = 0; i < dustCount; i++) {
        const r = 8;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        dustPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph));
        dustCol.push(0.9, 0.8, 0.6);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.Float32BufferAttribute(dustCol, 3));
    const dustSystem = new THREE.Points(dustGeo, new THREE.PointsMaterial({
        size: 0.04, vertexColors: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending
    }));
    scene.add(dustSystem);

    // Interaction
    let mouse = new THREE.Vector2(-100, -100);
    const raycaster = new THREE.Raycaster();

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    container.addEventListener('mouseleave', () => { mouse.set(-100, -100); });

    // Arrays reuse
    const pPos = new THREE.Vector3();
    const oPos = new THREE.Vector3();
    const rayPt = new THREE.Vector3();

    let time = 0;

    // PHYSICS CONFIG (Igloo Style - Refined for Definition)
    // Fluid but stable
    const FLUID_SPEED = 0.4;
    const REPEL_RADIUS = 1.2;
    const REPEL_FORCE = 4.0;
    const RETURN_Spring = 0.02; // Stronger return for shape definition
    const DAMPING = 0.95;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.003; // Slow time

        raycaster.setFromCamera(mouse, camera);
        const invMat = new THREE.Matrix4().copy(particlesGroup.matrixWorld).invert();
        const localRay = new THREE.Ray().copy(raycaster.ray).applyMatrix4(invMat);

        const posArr = geometry.attributes.position.array;

        for (let i = 0; i < TOTAL_PARTICLES; i++) {
            const i3 = i * 3;

            pPos.set(posArr[i3], posArr[i3 + 1], posArr[i3 + 2]);
            oPos.set(originalPositions[i3], originalPositions[i3 + 1], originalPositions[i3 + 2]);

            // 1. NOISE FLOW FIELD (Swirling motion)
            // Use time and position to sample 3D noise
            const noiseScale = 1.5;
            const flowX = SimplexNoise.noise3D(pPos.x * noiseScale, pPos.y * noiseScale, time + randomness[i3] * 0.01);
            const flowY = SimplexNoise.noise3D(pPos.y * noiseScale, pPos.z * noiseScale, time + randomness[i3 + 1] * 0.01);
            const flowZ = SimplexNoise.noise3D(pPos.z * noiseScale, pPos.x * noiseScale, time + randomness[i3 + 2] * 0.01);

            velocities[i3] += flowX * 0.008 * FLUID_SPEED;
            velocities[i3 + 1] += flowY * 0.008 * FLUID_SPEED;
            velocities[i3 + 2] += flowZ * 0.008 * FLUID_SPEED;

            // 2. INTERACTIVE REPULSION
            localRay.closestPointToPoint(pPos, rayPt);
            const dSq = pPos.distanceToSquared(rayPt);

            if (dSq < REPEL_RADIUS * REPEL_RADIUS) {
                const dist = Math.sqrt(dSq);
                const pct = 1 - (dist / REPEL_RADIUS);
                // Cubic easing for soft "bubble" feel
                const force = Math.pow(pct, 3) * REPEL_FORCE;

                // Direction
                const dx = pPos.x - rayPt.x;
                const dy = pPos.y - rayPt.y;
                const dz = pPos.z - rayPt.z;
                const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;

                velocities[i3] += (dx / len) * force;
                velocities[i3 + 1] += (dy / len) * force;
                velocities[i3 + 2] += (dz / len) * force;

                // Add some "Curl" swirl around the cursor??
                // Cross product of Up and Dir?
                // Adds complexity, stick to noise + push.
            }

            // 3. HOME SPRING (Return to original pos)
            velocities[i3] += (oPos.x - pPos.x) * RETURN_Spring;
            velocities[i3 + 1] += (oPos.y - pPos.y) * RETURN_Spring;
            velocities[i3 + 2] += (oPos.z - pPos.z) * RETURN_Spring;

            // 4. DAMPING
            velocities[i3] *= DAMPING;
            velocities[i3 + 1] *= DAMPING;
            velocities[i3 + 2] *= DAMPING;

            // 5. UPDATE
            posArr[i3] += velocities[i3];
            posArr[i3 + 1] += velocities[i3 + 1];
            posArr[i3 + 2] += velocities[i3 + 2];
        }

        geometry.attributes.position.needsUpdate = true;

        particlesGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
        dustSystem.rotation.y -= 0.001;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
})();
