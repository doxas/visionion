// - visionion ----------------------------------------------------------------
//
// visionion
//
// ----------------------------------------------------------------------------

/*global gl3*/

(function(){
    'use strict';

    // variable ===============================================================
    var canvas, gl, run, mat4, qtn;
    var canvasPoint, canvasGlow;
    var prg, nPrg, gPrg, sPrg, fPrg;
    var gWeight;
    var canvasWidth, canvasHeight;
    var pCanvas, pContext, pPower, pTarget, pCount, pListener;

    // variable initialize ====================================================
    run = true;
    mat4 = gl3.mat4;
    qtn = gl3.qtn;

    // const variable =========================================================
    var DEFAULT_CAM_POSITION = [0.0, 0.0, 5.0];
    var DEFAULT_CAM_CENTER   = [0.0, 0.0, 0.0];
    var DEFAULT_CAM_UP       = [0.0, 1.0, 0.0];

    // onload =================================================================
    function progressInit(){
        pPower = pTarget = pCount = 0;
        pListener = [];
        pCanvas = document.getElementById('progress');
        pCanvas.width = pCanvas.height = 100;
        pContext = pCanvas.getContext('2d');
        pContext.strokeStyle = 'white';
        progressUpdate();
    }

    function progressUpdate(){
        var i = gl3.util.easeOutCubic(Math.min(pCount / 10, 1.0));
        var j = (pPower + Math.floor((pTarget - pPower) * i)) / 100;
        var k = -Math.PI * 0.5;
        pContext.clearRect(0, 0, 100, 100);
        pContext.beginPath();
        pContext.arc(50, 50, 30, k, k + j * 2.0 * Math.PI, false);
        pContext.stroke();
        pContext.closePath();
        if(pTarget !== pPower){pCount++;}
        if(pCount > 10 && pTarget === 100){
            var e = document.getElementById('start');
            e.textContent = 'ready';
            e.className = '';
            e.addEventListener('click', progressRender, false);
            return;
        }
        requestAnimationFrame(progressUpdate);
    }

    function progressRender(){
        var e = document.getElementById('start');
        if(e.className !== ''){return;}
        e.textContent = 'start';
        e.className = 'disabled';
        e = document.getElementById('layer');
        e.className = 'disabled';
        setTimeout(function(){
            var e = document.getElementById('layer');
            e.className = 'none';
            // fullscreenRequest();
            init();
        }, 2000);
    }

    window.addEventListener('load', function(){
        progressInit();

        // canvas draw
        canvasPoint = canvasDrawPoint();
        canvasGlow  = canvasDrawGlow();

        // gl3 initialize
        gl3.initGL('canvas');
        if(!gl3.ready){console.log('initialize error'); return;}
        canvas = gl3.canvas; gl = gl3.gl;
        canvas.width  = canvasWidth = window.innerWidth;
        canvas.height = canvasHeight = window.innerHeight;

        // event
        window.addEventListener('keydown', function(eve){
            run = (eve.keyCode !== 27);
            switch(eve.keyCode){
                case 13:
                    progressRender();
                    break;
                case 27:
                    gl3.audio.src[0].stop();
                    break;
                case 32:
                    gl3.audio.src[1].play();
                    break;
                default :
                    break;
            }
        }, true);

        // progress == 20%
        pTarget = 20;
        pCount = 0;
        setTimeout(function(){
            gl3.create_texture_canvas(canvasPoint, 0);
            gl3.create_texture_canvas(canvasPoint, 1);
            gl3.create_texture('img/test.jpg', 2, soundLoader);
        }, 300);
    }, false);

    function soundLoader(){
        // progress == 40%
        pPower = pTarget;
        pTarget = 40;
        pCount = 0;
        setTimeout(function(){
            gl3.audio.init(0.5, 0.5);
            gl3.audio.load('snd/background.mp3', 0, true, true, soundLoadCheck);
            gl3.audio.load('snd/sound.mp3', 1, false, false, soundLoadCheck);

            function soundLoadCheck(){
                if(gl3.audio.loadComplete()){
                    // progress == 80%
                    pPower = pTarget;
                    pTarget = 80;
                    pCount = 0;
                    setTimeout(function(){
                        shaderLoader();
                    }, 300);
                }
            }
        }, 300);
    }

    function shaderLoader(){
        // programs
        prg = gl3.program.create_from_file(
            'shader/phong.vert',
            'shader/phong.frag',
            ['position', 'normal', 'color', 'texCoord'],
            [3, 3, 4, 2],
            ['mvpMatrix', 'invMatrix', 'lightDirection', 'eyePosition', 'centerPoint', 'ambient', 'texture'],
            ['matrix4fv', 'matrix4fv', '3fv', '3fv', '3fv', '4fv', '1i'],
            shaderLoadCheck
        );

        // noise program
        nPrg = gl3.program.create_from_file(
            'shader/noise.vert',
            'shader/noise.frag',
            ['position'],
            [3],
            ['resolution'],
            ['2fv'],
            shaderLoadCheck
        );

        // gauss program
        gPrg = gl3.program.create_from_file(
            'shader/gaussian.vert',
            'shader/gaussian.frag',
            ['position'],
            [3],
            ['resolution', 'horizontal', 'weight', 'texture'],
            ['2fv', '1i', '1fv', '1i'],
            shaderLoadCheck
        );

        // sobel program
        sPrg = gl3.program.create_from_file(
            'shader/sobel.vert',
            'shader/sobel.frag',
            ['position'],
            [3],
            ['resolution', 'hWeight', 'vWeight', 'texture'],
            ['2fv', '1fv', '1fv', '1i'],
            shaderLoadCheck
        );

        // sobel program
        fPrg = gl3.program.create_from_file(
            'shader/final.vert',
            'shader/final.frag',
            ['position'],
            [3],
            ['globalColor', 'texture'],
            ['4fv', '1i'],
            shaderLoadCheck
        );

        function shaderLoadCheck(){
            if( prg.prg != null &&
               nPrg.prg != null &&
               gPrg.prg != null &&
               sPrg.prg != null &&
               fPrg.prg != null){
                // progress == 100%
                pPower = pTarget;
                pTarget = 100;
                pCount = 0;
            }
        }
    }

    function init(){
        // application setting
        canvasWidth   = window.innerWidth;
        canvasHeight  = window.innerHeight;
        canvas.width  = canvasWidth;
        canvas.height = canvasHeight;
        gWeight = gaussWeight(10, 100.0);
        var hWeight = [
             1.0,  0.0, -1.0,
             2.0,  0.0, -2.0,
             1.0,  0.0, -1.0
        ];
        var vWeight = [
             1.0,  2.0,  1.0,
             0.0,  0.0,  0.0,
            -1.0, -2.0, -1.0
        ];

        // cylinder mesh
        var cylinderData = cylinder();
        var cylinderVBO = [
            gl3.create_vbo(cylinderData.position),
            gl3.create_vbo(cylinderData.normal),
            gl3.create_vbo(cylinderData.type),
            gl3.create_vbo(cylinderData.texCoord)
        ];
        var cylinderIBO = gl3.create_ibo(cylinderData.index);

        // torus mesh
        var torusData = gl3.mesh.torus(64, 64, 0.075, 0.2, [1.0, 1.0, 1.0, 1.0]);
        var torusVBO = [
            gl3.create_vbo(torusData.position),
            gl3.create_vbo(torusData.normal),
            gl3.create_vbo(torusData.color),
            gl3.create_vbo(torusData.texCoord)
        ];
        var torusIBO = gl3.create_ibo(torusData.index);

        // plane mesh
        var planePosition = [
            -1.0,  1.0,  0.0,
             1.0,  1.0,  0.0,
            -1.0, -1.0,  0.0,
             1.0, -1.0,  0.0
        ];
        var planeIndex = [
            0, 2, 1, 1, 2, 3
        ];
        var planeVBO = [gl3.create_vbo(planePosition)];
        var planeIBO = gl3.create_ibo(planeIndex);

        // matrix
        var mMatrix = mat4.identity(mat4.create());
        var vMatrix = mat4.identity(mat4.create());
        var pMatrix = mat4.identity(mat4.create());
        var vpMatrix = mat4.identity(mat4.create());
        var mvpMatrix = mat4.identity(mat4.create());
        var invMatrix = mat4.identity(mat4.create());

        // frame buffer
        var bufferSize = 1024;
        var noiseBuffer  = gl3.create_framebuffer(bufferSize, bufferSize, 5);
        var frameBuffer  = gl3.create_framebuffer(canvasWidth, canvasHeight, 4);
        var sobelBuffer  = gl3.create_framebuffer(canvasWidth, canvasHeight, 6);
        var hGaussBuffer = gl3.create_framebuffer(canvasWidth, canvasHeight, 7);
        var vGaussBuffer = gl3.create_framebuffer(canvasWidth, canvasHeight, 8);

        // texture setting
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[0].texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[1].texture);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[2].texture);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[4].texture);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[5].texture);
        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[6].texture);
        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[7].texture);
        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, gl3.textures[8].texture);

        // noise texture
        nPrg.set_program();
        nPrg.set_attribute(planeVBO, planeIBO);
        gl.bindFramebuffer(gl.FRAMEBUFFER, noiseBuffer.framebuffer);
        gl3.scene_clear([0.0, 0.0, 0.0, 1.0]);
        gl3.scene_view(null, 0, 0, bufferSize, bufferSize);
        nPrg.push_shader([[bufferSize, bufferSize]]);
        gl3.draw_elements(gl.TRIANGLES, planeIndex.length);

        // gl flags
        gl.disable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clearDepth(1.0);
        gl.disable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
        // gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE. gl.ONE);

        // rendering
        var count = 0;
        var beginTime = Date.now();
        var lightDirection = [1.0, 1.0, 1.0];
        // gl3.audio.src[0].play();
        render();
        function render(){
            var i;
            var nowTime = Date.now() - beginTime;
            nowTime /= 1000;
            count++;

            // canvas
            canvasWidth   = window.innerWidth;
            canvasHeight  = window.innerHeight;
            canvas.width  = canvasWidth;
            canvas.height = canvasHeight;

            // perspective projection
            var cameraPosition    = DEFAULT_CAM_POSITION;
            var centerPoint       = DEFAULT_CAM_CENTER;
            var cameraUpDirection = DEFAULT_CAM_UP;
            var camera = gl3.camera.create(
                cameraPosition,
                centerPoint,
                cameraUpDirection,
                45, canvasWidth / canvasHeight, 0.1, 10.0
            );
            mat4.vpFromCamera(camera, vMatrix, pMatrix, vpMatrix);

            // cylinder
            prg.set_program();
            prg.set_attribute(cylinderVBO, cylinderIBO);

            // render to frame buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.framebuffer);
            gl3.scene_clear([0.025, 0.025, 0.05, 1.0], 1.0);
            gl3.scene_view(camera, 0, 0, canvasWidth, canvasHeight);

            // sound data
            gl3.audio.src[0].update = true;
            var soundData = [];
            for(i = 0; i < 16; ++i){
                soundData[i] = gl3.audio.src[0].onData[i] / 255.0 + 0.5;
            }

            // off screen
            var radian = gl3.TRI.rad[count % 360];
            var axis = [0.0, 1.0, 0.0];
            for(i = 0; i < 15; i++){
                var s = gl3.TRI.sin[i * 24] * soundData[i];
                var c = gl3.TRI.cos[i * 24] * soundData[i];
                var offset = [c * 3.0, s * 3.0, 0.0];
                var ambient = gl3.util.hsva(i * 24, 1.0, 1.0, 1.0);
                mat4.identity(mMatrix);
                mat4.translate(mMatrix, offset, mMatrix);
                mat4.rotate(mMatrix, radian, axis, mMatrix);
                mat4.scale(mMatrix, [0.3, 0.3, 0.3], mMatrix);
                mat4.multiply(vpMatrix, mMatrix, mvpMatrix);
                mat4.inverse(mMatrix, invMatrix);
                prg.push_shader([mvpMatrix, invMatrix, lightDirection, cameraPosition, centerPoint, ambient, 5]);
                gl3.draw_elements(gl.TRIANGLES, cylinderData.index.length);
            }

            // sobel render to gauss buffer
            sPrg.set_program();
            sPrg.set_attribute(planeVBO, planeIBO);
            gl.bindFramebuffer(gl.FRAMEBUFFER, sobelBuffer.framebuffer);
            gl3.scene_clear([0.0, 0.0, 0.0, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            sPrg.push_shader([[canvasWidth, canvasHeight], hWeight, vWeight, 4]);
            gl3.draw_elements(gl.TRIANGLES, planeIndex.length);

            // horizon gauss render to fBuffer
            gPrg.set_program();
            gPrg.set_attribute(planeVBO, planeIBO);
            gl.bindFramebuffer(gl.FRAMEBUFFER, hGaussBuffer.framebuffer);
            gl3.scene_clear([0.0, 0.0, 0.0, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            gPrg.push_shader([[canvasWidth, canvasHeight], true, gWeight, 6]);
            gl3.draw_elements(gl.TRIANGLES, planeIndex.length);

            // vertical gauss render to fBuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, vGaussBuffer.framebuffer);
            gl3.scene_clear([0.0, 0.0, 0.0, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            gPrg.push_shader([[canvasWidth, canvasHeight], false, gWeight, 7]);
            gl3.draw_elements(gl.TRIANGLES, planeIndex.length);

            // final scene
            fPrg.set_program();
            fPrg.set_attribute(planeVBO, planeIBO);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl3.scene_clear([0.0, 0.0, 0.0, 1.0], 1.0);
            gl3.scene_view(null, 0, 0, canvasWidth, canvasHeight);
            fPrg.push_shader([[1.0, 1.0, 1.0, 1.0], 4]);
            gl3.draw_elements(gl.TRIANGLES, planeIndex.length);
            fPrg.push_shader([[1.0, 1.0, 1.0, 0.5], 8]);
            gl3.draw_elements(gl.TRIANGLES, planeIndex.length);

            if(run){requestAnimationFrame(render);}
        }
    }

    function gaussWeight(resolution, power){
        var t = 0.0;
        var weight = [];
        for(var i = 0; i < resolution; i++){
            var r = 1.0 + 2.0 * i;
            var w = Math.exp(-0.5 * (r * r) / power);
            weight[i] = w;
            if(i > 0){w *= 2.0;}
            t += w;
        }
        for(i = 0; i < weight.length; i++){
            weight[i] /= t;
        }
        return weight;
    }

    function fullscreenRequest(){
        var b = document.body;
        if(b.requestFullscreen){
            b.requestFullscreen();
        }else if(b.webkitRequestFullscreen){
            b.webkitRequestFullscreen();
        }else if(b.mozRequestFullscreen){
            b.mozRequestFullscreen();
        }else if(b.msRequestFullscreen){
            b.msRequestFullscreen();
        }
    }

    function canvasDrawPoint(){
        var i, j, p, center;
        var c = document.createElement('canvas');
        var cx = c.getContext('2d');
        p = Math.PI * 2;
        c.width = c.height = 512;
        center = [c.width / 2, c.height / 2];
        cx.fillStyle = 'white';
        cx.strokeStyle = 'white';
        cx.shadowColor = 'white';
        cx.clearRect(0, 0, c.width, c.height);
        cx.shadowOffsetX = 512;
        cx.shadowOffsetY = 512;
        cx.beginPath();
        for(i = -1; i < 5; ++i){
            j = 20 - Math.pow(2, i);
            cx.shadowBlur = j;
            cx.arc(center[0] - 512, center[1] - 512, 200, 0, p);
            cx.stroke();
        }
        cx.closePath();
        cx.beginPath();
        cx.shadowOffsetX = 0;
        cx.shadowOffsetY = 0;
        for(i = -1; i < 6; ++i){
            j = 32 - Math.pow(2, i);
            cx.shadowBlur = j;
            cx.arc(center[0], center[1], 75, 0, p);
            cx.fill();
        }
        cx.shadowBlur = 0;
        cx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        cx.arc(center[0], center[1], 200, 0, p);
        cx.fill();
        cx.closePath();
        c.id = 'point';
        return c;
    }

    function canvasDrawGlow(){
        var i, j, center;
        var c = document.createElement('canvas');
        var cx = c.getContext('2d');
        c.width = c.height = 512;
        center = [c.width / 2, c.height / 2];
        cx.fillStyle = 'white';
        cx.shadowColor = 'white';
        cx.clearRect(0, 0, c.width, c.height);
        cx.beginPath();
        for(i = -1; i < 7; ++i){
            j = 100 - Math.pow(2, i);
            cx.shadowBlur = j;
            cx.arc(center[0], center[1], 150, 0, Math.PI * 2);
            cx.fill();
        }
        cx.closePath();
        c.id = 'glow';
        return c;
    }

    // type: temp, temp, temp, temp
    function cylinder(){
        var i, j, k;
        var s, c;
        var x, y, z;
        var pos = [];
        var nor = [];
        var tex = [];
        var type = [];
        var idx = [];
        var res = 1024;
        for(i = 0; i <= res; ++i){
            j = gl3.PI2 / res * i;
            s = Math.sin(j); c = Math.cos(j);
            pos.push(c, 0.0, s);
            nor.push(c, 0.0, s);
            tex.push(i / res, 0.0);
            type.push(0.0, 0.0, 0.0, 0.0);
        }
        k = res + 1;
        for(i = 0; i <= res; ++i){
            j = gl3.PI2 / res * i;
            s = Math.sin(j); c = Math.cos(j);
            pos.push(c, 1.0, s);
            nor.push(c, 0.0, s);
            tex.push(i / res, 1.0);
            type.push(0.0, 0.0, 0.0, 0.0);
            if(i !== res){idx.push(i, i + 1, k + i, k + i, i + 1, k + i + 1);}
        }
        return {
            position: pos,
            normal: nor,
            texCoord: tex,
            type: type,
            index: idx
        };
    }
})(this);

