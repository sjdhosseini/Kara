package com.sjd.scan;
/** Pure pixel processing: no network, learned models, or invented image detail. */
public final class Enhance {
 public static final int[] DEFAULT={0,0,100,20,0,0};
 static int clamp(double v){return Math.max(0,Math.min(255,(int)Math.round(v)));}
 static int luma(int c){return (((c>>>16)&255)*77+((c>>>8)&255)*150+(c&255)*29)>>8;}
 static int rgb(int r,int g,int b){return 0xff000000|(r<<16)|(g<<8)|b;}
 public static void process(int[] pixels,int w,int h,int[] values){
  int brightness=values[0];double contrast=Math.pow(2,values[1]/70.0),sat=values[2]/100.0,sharp=values[3]/100.0,retouch=values[4]/100.0,denoise=values[5]/100.0;
  if(brightness==0&&values[1]==0&&sat==1&&sharp==0&&retouch==0&&denoise==0)return;
  byte[] lum=new byte[w*h];for(int i=0;i<lum.length;i++)lum[i]=(byte)luma(pixels[i]);
  int bw=Math.min(600,w),bh=Math.max(1,(int)((long)h*bw/w));float[] background=null;
  if(retouch>0){background=new float[bw*bh];for(int y=0;y<bh;y++)for(int x=0;x<bw;x++)background[y*bw+x]=lum[Math.min(h-1,(int)((y+.5)*h/bh))*w+Math.min(w-1,(int)((x+.5)*w/bw))]&255;
   // Morphological closing suppresses dark text in the illumination estimate.
   int r=Math.max(2,Math.min(bw,bh)/120);background=extreme(background,bw,bh,r,true);background=extreme(background,bw,bh,r,false);background=blur(background,bw,bh,Math.max(1,r/3));
  }
  for(int y=0;y<h;y++)for(int x=0;x<w;x++){
   int i=y*w+x,c=pixels[i],r=(c>>>16)&255,g=(c>>>8)&255,b=c&255,L=lum[i]&255;
   double soft=L;
   if(denoise>0||sharp>0){double sum=0,weights=0;int count=0,total=0;for(int yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(int xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){int v=lum[yy*w+xx]&255;int d=Math.abs(v-L);double weight=d<24?1-d/24.0:0;sum+=weight*v;weights+=weight;count++;total+=v;}double clean=weights>0?sum/weights:L;soft=L+(clean-L)*denoise;double detail=L-total/(double)count;if(Math.abs(detail)>2)soft+=Math.max(-25,Math.min(25,detail))*sharp*.8;}
   double factor=1;
   if(background!=null){double gx=(x+.5)*bw/w-.5,gy=(y+.5)*bh/h-.5;gx=Math.max(0,Math.min(bw-1,gx));gy=Math.max(0,Math.min(bh-1,gy));int x0=(int)gx,y0=(int)gy,x1=Math.min(bw-1,x0+1),y1=Math.min(bh-1,y0+1);double tx=gx-x0,ty=gy-y0;double bg=(background[y0*bw+x0]*(1-tx)+background[y0*bw+x1]*tx)*(1-ty)+(background[y1*bw+x0]*(1-tx)+background[y1*bw+x1]*tx)*ty;
    factor=1+retouch*(Math.min(2.4,250/Math.max(65,bg))-1);
   }
   double center=soft*factor;double R=center+(r-L)*factor*sat,G=center+(g-L)*factor*sat,B=center+(b-L)*factor*sat;
   pixels[i]=rgb(clamp((R-128)*contrast+128+brightness),clamp((G-128)*contrast+128+brightness),clamp((B-128)*contrast+128+brightness));
  }
 }
 // Separable monotonic-deque morphology: O(width*height), bounded scratch memory.
 static float[] extreme(float[] src,int w,int h,int radius,boolean max){float[] tmp=new float[src.length],out=new float[src.length];for(int y=0;y<h;y++)line(src,y*w,1,tmp,y*w,1,w,radius,max);for(int x=0;x<w;x++)line(tmp,x,w,out,x,w,h,radius,max);return out;}
 static void line(float[] s,int start,int stride,float[] out,int dest,int step,int n,int r,boolean max){int[] deque=new int[n];int head=0,tail=0,add=0;for(int x=0;x<n;x++){int end=Math.min(n-1,x+r);while(add<=end){float v=s[start+add*stride];while(tail>head&&(max?s[start+deque[tail-1]*stride]<=v:s[start+deque[tail-1]*stride]>=v))tail--;deque[tail++]=add++;}while(head<tail&&deque[head]<x-r)head++;out[dest+x*step]=s[start+deque[head]*stride];}}
 static float[] blur(float[] s,int w,int h,int r){float[] tmp=new float[s.length],out=new float[s.length];for(int y=0;y<h;y++){double sum=0;int lo=0,hi=-1;for(int x=0;x<w;x++){int a=Math.max(0,x-r),b=Math.min(w-1,x+r);while(hi<b)sum+=s[y*w+(++hi)];while(lo<a)sum-=s[y*w+(lo++)];tmp[y*w+x]=(float)(sum/(b-a+1));}}for(int x=0;x<w;x++){double sum=0;int lo=0,hi=-1;for(int y=0;y<h;y++){int a=Math.max(0,y-r),b=Math.min(h-1,y+r);while(hi<b)sum+=tmp[(++hi)*w+x];while(lo<a)sum-=tmp[(lo++)*w+x];out[y*w+x]=(float)(sum/(b-a+1));}}return out;}
}
