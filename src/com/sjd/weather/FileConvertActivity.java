package com.sjd.weather;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.graphics.*;
import android.graphics.pdf.PdfDocument;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.widget.TextView;
import android.widget.Toast;
import java.io.*;
import java.util.Arrays;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class FileConvertActivity extends Activity {
    private static final int PICK = 1, SAVE = 2;
    private String type;
    private File output;
    private TextView status;
    static boolean supports(String s) {
        return Arrays.asList("jpg","png","webp","pdf","pdfpng","zip").contains(s);
    }
    private String extension(){ return "pdfpng".equals(type) ? "png" : type; }
    private String mime(){
        if ("jpg".equals(type)) return "image/jpeg";
        if ("pdf".equals(type) || "zip".equals(type)) return "application/" + type;
        return "image/" + extension();
    }
    public void onCreate(Bundle state){
        super.onCreate(state);
        type=getIntent().getStringExtra("type");
        if(!supports(type)){finish();return;}
        status=new TextView(this); status.setGravity(17);status.setTextSize(18);
        status.setBackgroundColor(0xff102c24);status.setTextColor(-1);setContentView(status);
        status.setText("انتخاب فایل…");
        if(state!=null){
            String path=state.getString("output");
            if(path!=null) output=new File(path);
            if(state.getBoolean("working")) fail("تبدیل قطع شد؛ دوباره امتحان کن.");
            return;
        }
        Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("zip".equals(type)?"*/*":"pdfpng".equals(type)?"application/pdf":"image/*");
        try{startActivityForResult(pick,PICK);}catch(Exception e){fail("انتخاب‌گر فایل در دسترس نیست.");}
    }
    private boolean working;
    protected void onSaveInstanceState(Bundle state){
        super.onSaveInstanceState(state);state.putBoolean("working",working);
        if(output!=null)state.putString("output",output.getPath());
    }
    private void fail(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();finish();}
    private String displayName(Uri uri){
        try(Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){
            if(c!=null && c.moveToFirst() && c.getString(0)!=null)return c.getString(0).replaceAll("[/\\\\]","_");
        }catch(Exception ignored){}
        return "file";
    }
    protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null){finish();return;}
        Uri uri=data.getData();working=true;
        status.setText(req==PICK?"در حال تبدیل…":"در حال ذخیره…");
        new Thread(()->{
            try{
                if(req==PICK){
                    String name=displayName(uri);
                    output=File.createTempFile("convert-", ".tmp",getCacheDir());
                    try(OutputStream out=new BufferedOutputStream(new FileOutputStream(output))){
                        if("zip".equals(type)){
                            try(ZipOutputStream zip=new ZipOutputStream(out);InputStream in=getContentResolver().openInputStream(uri)){
                                zip.putNextEntry(new ZipEntry(name));copy(in,zip);zip.closeEntry();
                            }
                        }else if("pdfpng".equals(type)) renderPage(uri,out);
                        else convertImage(uri,out);
                    }
                    String stem="zip".equals(type)? name : name.replaceFirst("\\.[^.]+$","");
                    runOnUiThread(()->{
                        working=false;
                        if(isFinishing()||isDestroyed()){output.delete();return;}
                        Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                            .setType(mime()).putExtra(Intent.EXTRA_TITLE,stem+"."+extension());
                        try{startActivityForResult(save,SAVE);}catch(Exception e){fail("ذخیرهٔ فایل در دسترس نیست.");}
                    });
                }else{
                    try(InputStream in=new FileInputStream(output);OutputStream out=getContentResolver().openOutputStream(uri,"wt")){copy(in,out);}
                    runOnUiThread(()->{working=false;fail("فایل تبدیل‌شده ذخیره شد.");});
                }
            }catch(Exception | OutOfMemoryError error){runOnUiThread(()->{working=false;fail("تبدیل یا ذخیره انجام نشد؛ فرمت، اندازه و فضای آزاد را بررسی کن.");});}
        }).start();
    }
    private static void copy(InputStream in,OutputStream out)throws IOException{
        if(in==null||out==null)throw new IOException();
        byte[] buffer=new byte[32768];int count;
        while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
    }
    private void renderPage(Uri uri,OutputStream out)throws IOException{
        try(ParcelFileDescriptor fd=getContentResolver().openFileDescriptor(uri,"r");PdfRenderer pdf=new PdfRenderer(fd);PdfRenderer.Page page=pdf.openPage(0)){
            double scale=Math.min(2.0,3072.0/Math.max(page.getWidth(),page.getHeight()));
            Bitmap bmp=Bitmap.createBitmap(Math.max(1,(int)(page.getWidth()*scale)),Math.max(1,(int)(page.getHeight()*scale)),Bitmap.Config.ARGB_8888);
            try{bmp.eraseColor(Color.WHITE);page.render(bmp,null,null,PdfRenderer.Page.RENDER_MODE_FOR_PRINT);
                if(!bmp.compress(Bitmap.CompressFormat.PNG,100,out))throw new IOException();}
            finally{bmp.recycle();}
        }
    }
    private void convertImage(Uri uri,OutputStream out)throws IOException{
        BitmapFactory.Options opts=new BitmapFactory.Options();opts.inJustDecodeBounds=true;
        try(InputStream in=getContentResolver().openInputStream(uri)){BitmapFactory.decodeStream(in,null,opts);}
        if(opts.outWidth<=0||opts.outHeight<=0)throw new IOException();
        opts.inJustDecodeBounds=false;opts.inSampleSize=1;
        while((long)opts.outWidth*opts.outHeight/opts.inSampleSize/opts.inSampleSize>12000000L)opts.inSampleSize*=2;
        Bitmap bmp;
        try(InputStream in=getContentResolver().openInputStream(uri)){bmp=BitmapFactory.decodeStream(in,null,opts);}
        if(bmp==null)throw new IOException();
        try{
            if("pdf".equals(type)){
                PdfDocument pdf=new PdfDocument();try{
                    PdfDocument.Page page=pdf.startPage(new PdfDocument.PageInfo.Builder(bmp.getWidth(),bmp.getHeight(),1).create());
                    page.getCanvas().drawColor(Color.WHITE);page.getCanvas().drawBitmap(bmp,null,new Rect(0,0,bmp.getWidth(),bmp.getHeight()),null);
                    pdf.finishPage(page);pdf.writeTo(out);
                }finally{pdf.close();}
            }else{
                Bitmap.CompressFormat format="jpg".equals(type)?Bitmap.CompressFormat.JPEG:"png".equals(type)?Bitmap.CompressFormat.PNG:Bitmap.CompressFormat.WEBP;
                if(format==Bitmap.CompressFormat.JPEG && bmp.hasAlpha()){
                    Bitmap flat=Bitmap.createBitmap(bmp.getWidth(),bmp.getHeight(),Bitmap.Config.ARGB_8888);
                    Canvas canvas=new Canvas(flat);canvas.drawColor(Color.WHITE);canvas.drawBitmap(bmp,0,0,null);bmp.recycle();bmp=flat;
                }
                if(!bmp.compress(format,94,out))throw new IOException();
            }
        }finally{bmp.recycle();}
    }
    protected void onDestroy(){if(output!=null && isFinishing())output.delete();super.onDestroy();}
}
