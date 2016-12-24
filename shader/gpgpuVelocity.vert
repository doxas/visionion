attribute vec3 position;
attribute vec2 texCoord;
varying vec2 vTexCoord;
void main(){
    vTexCoord = texCoord;
    gl_Position = vec4(position, 1.0);
    gl_PointSize = 1.0;
}
