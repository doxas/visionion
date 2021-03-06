/* ----------------------------------------------------------------------------
 * vignette shader
 * ---------------------------------------------------------------------------- */
precision mediump float;
uniform vec4 globalColor;
uniform vec2 resolution;
void main(){
    vec2 p = gl_FragCoord.xy / resolution * 2.0 - 1.0;
    float l = 1.0 - min(1.0, 0.95 - length(p * 0.5));
    gl_FragColor = vec4(vec3(0.0), l) * globalColor;
}
