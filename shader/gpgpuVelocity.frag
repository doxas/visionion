/* ----------------------------------------------------------------------------
 * gpgpu velocity update shader
 * ---------------------------------------------------------------------------- */
precision highp float;
uniform float time;
uniform sampler2D noiseTexture;
uniform sampler2D previousTexture;
uniform sampler2D positionTexture;
varying vec2 vTexCoord;
const float speed = 0.05;
void main(){
    float tmp = time;
    vec4 n = texture2D(noiseTexture, vTexCoord);
    vec4 m = texture2D(previousTexture, vTexCoord);
    vec4 p = texture2D(positionTexture, vTexCoord);
    gl_FragColor = vec4(normalize(m.xyz), 1.0);
}
