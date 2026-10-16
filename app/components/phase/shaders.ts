export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uProgress;
uniform float uIntro;
uniform float uPass;

mat2 rotate(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec3 p) {
  p=fract(p*0.1031);
  p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
    mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
    mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  float n=0.0, a=0.55;
  for(int i=0;i<4;i++){ n+=a*noise(p); p=p*2.06+vec3(7.3,2.8,5.1); a*=0.48; }
  return n;
}
vec3 local(vec3 p) {
  p.y-=2.05;
  p.xz=rotate(-0.30+uProgress*0.12)*p.xz;
  p.xy=rotate(-0.38)*p.xy;
  return p;
}
// Two offset, open annuli form the phase mark. The front groove is emissive.
vec2 ring(vec3 p, float radius, float gap) {
  p.z += 0.14*sin(atan(p.y,p.x)*2.0);
  float radial=length(p.xy)-radius;
  float body=length(vec2(radial, max(abs(p.z)-0.115,0.0)))-0.105;
  body=max(body, min(p.x, p.y-gap));
  float light=length(vec2(radial,p.z-0.212))-0.016;
  light=max(light,min(p.x+0.025,p.y-gap+0.025));
  return vec2(body,light);
}
vec2 shape(vec3 p) {
  p=local(p);
  vec2 a=ring(p,1.30,0.11);
  p.xy=rotate(3.14159265)*p.xy;
  p.xz=rotate(0.72)*p.xz;
  vec2 b=ring(p,0.91,0.08);
  return min(a,b);
}
float distanceToMark(vec3 p) { vec2 d=shape(p); return min(d.x,d.y); }
vec3 normalAt(vec3 p) {
  vec2 e=vec2(0.0015,0);
  return normalize(vec3(distanceToMark(p+e.xyy)-distanceToMark(p-e.xyy),
    distanceToMark(p+e.yxy)-distanceToMark(p-e.yxy),
    distanceToMark(p+e.yyx)-distanceToMark(p-e.yyx)));
}
float trace(vec3 ro, vec3 rd, float limit) {
  float t=0.0;
  for(int i=0;i<76;i++) {
    float d=distanceToMark(ro+rd*t);
    if(d<0.0018 || t>limit) break;
    t+=d*0.8;
  }
  return t;
}
float power() { return mix(0.025,1.0,smoothstep(0.03,0.72,uProgress))*uIntro; }
vec3 red() { return vec3(1.0,0.003,0.006); }
vec3 surface(vec3 p, vec3 rd) {
  vec2 d=shape(p);
  vec3 n=normalAt(p);
  vec3 lightDir=normalize(vec3(-3.0,6.0,3.0));
  float spec=pow(max(dot(reflect(-lightDir,n),-rd),0.0),38.0);
  float fresnel=pow(1.0-max(dot(n,-rd),0.0),3.0);
  vec3 col=vec3(0.008,0.010,0.014)*(0.22+max(dot(n,lightDir),0.0)*2.0);
  col+=vec3(0.5,0.56,0.61)*spec*0.9+vec3(0.055)*fresnel;
  col+=red()*power()*0.006/(0.035+abs(d.y));
  if(d.y<0.004) col=vec3(5.0,0.035,0.055)*power();
  return col;
}
vec3 background(vec3 rd) {
  float overhead=pow(max(dot(rd,normalize(vec3(-0.4,0.85,-0.5))),0.0),5.0);
  return vec3(0.006,0.008,0.011)+vec3(0.032,0.039,0.049)*overhead;
}
void main() {
  vec2 uv=(vUv-0.5)*2.0;
  float aspect=uResolution.x/uResolution.y;
  uv.x*=aspect;
  float cameraDistance=aspect<1.0 ? 8.8 : 7.2;
  vec3 ro=vec3(uPointer.x*0.16,2.65+uPointer.y*0.10,cameraDistance-uProgress*0.55);
  vec3 target=vec3(0,1.85,0);
  vec3 forward=normalize(target-ro);
  vec3 right=normalize(cross(forward,vec3(0,1,0)));
  vec3 up=cross(right,forward);
  vec3 rd=normalize(forward*1.85+right*uv.x+up*uv.y);
  float floorT=rd.y<0.0 ? -ro.y/rd.y : 30.0;
  float hit=trace(ro,rd,min(floorT,18.0));
  float end=min(min(floorT,hit),18.0);
  if(uPass<0.5) {
  vec3 col=background(rd);
  if(hit<min(floorT,18.0)) col=surface(ro+rd*hit,rd);
  else if(floorT<18.0) {
    vec3 p=ro+rd*floorT;
    float rough=noise(p*vec3(64.0,1.0,8.0));
    vec3 n=normalize(vec3((noise(p*20.0)-0.5)*0.01,1.0,(rough-0.5)*0.012));
    vec3 reflected=reflect(rd,n);
    float r=trace(p+vec3(0,0.01,0),reflected,12.0);
    col=vec3(0.006,0.008,0.011)*(0.9+rough*0.1);
    col+=vec3(0.022,0.026,0.03)*exp(-length(p.xz-vec2(-3,-3))*0.2);
    if(r<12.0) col+=surface(p+vec3(0,0.01,0)+reflected*r,reflected)*0.24;
    col+=red()*power()*0.13*exp(-p.x*p.x*0.5-abs(p.z)*0.65)*(0.85+rough*0.15);
    col*=0.6+0.4*smoothstep(0.0,2.2,length(p.xz));
  }
  gl_FragColor=vec4(col,1.0);
  return;
  }
  // Front-to-back integration: both extinction and light scattering depend on density.
  vec3 scattered=vec3(0);
  float transmission=1.0;
  float stepLength=end/64.0;
  float jitter=0.5+(hash(vec3(gl_FragCoord.xy,0.0))-0.5)*0.12;
  float glow=0.0;
  for(int i=0;i<64;i++) {
    float t=(float(i)+jitter)*stepLength;
    vec3 p=ro+rd*t;
    vec3 flow=p*1.35+vec3(uTime*0.10,-uTime*0.065,uTime*0.035);
    float warp=fbm(flow*0.8);
    float cloud=fbm(flow*1.9+vec3(warp*4.7,warp*2.9,-warp*2.0));
    float envelope=exp(-pow((p.y-1.45)/1.6,2.0))*exp(-pow((p.z-1.5)/1.9,2.0));
    float opening=1.0-uProgress*0.995*exp(-p.x*p.x*0.045);
    float density=smoothstep(0.38,0.66,cloud)*envelope*opening*3.8;
    float extinction=exp(-density*stepLength);
    float nearMark=abs(shape(p).y);
    float illumination=1.0/(1.0+nearMark*nearMark*3.8);
    float silver=pow(max(cloud-0.35,0.0)*2.0,2.0);
    float topLight=exp(-length(p-vec3(-3.0,4.5,1.0))*0.24);
    vec3 lighting=vec3(0.012,0.016,0.021)+vec3(0.36,0.39,0.43)*silver*topLight;
    lighting+=red()*power()*illumination*0.85;
    scattered+=transmission*(1.0-extinction)*lighting;
    glow+=transmission*exp(-nearMark*22.0)*stepLength*power();
    transmission*=extinction;
  }
  scattered+=red()*glow*1.25;
  gl_FragColor=vec4(scattered,transmission);
}
`;

export const compositeShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uSmoke;
uniform vec2 uPixel;
void main() {
  vec4 fog=texture2D(uSmoke,vUv);
  vec3 scene=texture2D(uScene,vUv).rgb;
  vec3 col=scene*fog.a+fog.rgb;
  vec3 bloom=vec3(0.0);
  for(int i=0;i<12;i++) {
    float a=float(i)*0.523599;
    vec2 offset=vec2(cos(a),sin(a))*uPixel*7.0;
    vec3 sampleColor=texture2D(uScene,vUv+offset).rgb;
    bloom+=max(sampleColor-vec3(0.7),vec3(0.0))/12.0;
  }
  col+=bloom*0.18*fog.a;
  col*=1.0-0.38*pow(length(vUv-0.5)*1.15,2.0);
  col=vec3(1.0)-exp(-col*1.35);
  col=pow(col,vec3(0.4545));
  gl_FragColor=vec4(col,1.0);
}
`;
