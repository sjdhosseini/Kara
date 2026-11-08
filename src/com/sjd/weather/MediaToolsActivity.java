package com.sjd.weather;
import android.app.*;import android.os.*;import android.content.*;import android.net.Uri;import android.media.*;import android.graphics.Typeface;import android.graphics.drawable.GradientDrawable;import android.view.*;import android.widget.*;import java.io.*;import java.nio.ByteBuffer;import java.util.*;import java.util.concurrent.*;

public class MediaToolsActivity extends Activity {
 private final ExecutorService work=Executors.newSingleThreadExecutor();
 private volatile boolean stopped=false;private boolean busy=false;private Uri video;private File output;private String extension="m4a",mime="audio/mp4";
 private TextView status,chosen;private EditText caption;private final ArrayList<Button> buttons=new ArrayList<>();private Typeface font;
 int dp(int n){return (int)(getResources().getDisplayMetrics().density*n+.5f);}
 public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(0xff102d25);getWindow().setNavigationBarColor(0xff102d25);try{font=Typeface.createFromAsset(getAssets(),"fonts/Vazirmatn.ttf");}catch(Exception e){}
  ScrollView scroll=new ScrollView(this);scroll.setBackgroundColor(0xff102d25);LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);root.setPadding(dp(18),dp(18),dp(18),dp(28));scroll.addView(root);setContentView(scroll);
  if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);scroll.setOnApplyWindowInsetsListener((v,in)->{android.graphics.Insets s=in.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(s.left,s.top,s.right,s.bottom);return WindowInsets.CONSUMED;});}else scroll.setFitsSystemWindows(true);
  text(root,"کارا · ابزار ویدیو",24);text(root,"صدا، تصویر و کپشن را جدا ذخیره کن",15);button(root,"بازگشت",()->onBackPressed());chosen=text(root,"هنوز ویدیویی انتخاب نشده",14);
  button(root,"انتخاب ویدیو از گوشی",()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("video/*");try{startActivityForResult(i,10);}catch(Exception e){message("انتخاب‌گر فایل در دسترس نیست.");}});
  button(root,"استخراج صدا · M4A",()->extract(true));button(root,"ساخت ویدیوی بی‌صدا · MP4",()->extract(false));
  text(root,"پردازش روی گوشی و بدون کاهش کیفیت انجام می‌شود. صدا باید AAC و تصویر H.264 یا H.265 باشد؛ اولین مسیر صدا یا تصویر انتخاب می‌شود.",13);
  text(root,"کپشن اینستاگرام",20);caption=new EditText(this);caption.setTextColor(-1);caption.setHintTextColor(0xffa8c6ba);caption.setHint("متن کپشن را اینجا بچسبان یا از برنامهٔ دیگر به kara اشتراک بگذار…");caption.setMinLines(4);caption.setGravity(Gravity.TOP|Gravity.RIGHT);caption.setTextSize(15);caption.setTypeface(font);caption.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);caption.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(20000)});root.addView(caption,new LinearLayout.LayoutParams(-1,-2));
  button(root,"کپی کپشن",()->{String t=caption.getText().toString().trim();if(t.isEmpty()){message("ابتدا متن کپشن را وارد کن.");return;}((ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("کپشن",t));message("کپشن کپی شد.");});
  button(root,"ذخیرهٔ کپشن · TXT",()->saveCaption());
  text(root,"ویدیوی دانلودشدهٔ اینستاگرام را انتخاب کن یا فایل ویدیو را با kara به اشتراک بگذار. لینک پست به‌تنهایی فایل ویدیو یا متن کپشن را منتقل نمی‌کند. دانلود خودکار از لینک و استخراج نوشتهٔ داخل تصویر در این نسخه وجود ندارد.",13);
  status=text(root,"آماده",15);button(root,"ذخیرهٔ دوبارهٔ خروجی آماده",()->offerSave());
  if(state!=null){String u=state.getString("video");if(u!=null)video=Uri.parse(u);caption.setText(state.getString("caption",""));String f=state.getString("output");if(f!=null){File x=new File(getCacheDir(),f);if(x.getName().startsWith("kara-media-")&&x.isFile())output=x;}extension=state.getString("extension","m4a");mime=state.getString("mime","audio/mp4");if(state.getBoolean("busy"))message("پردازش متوقف شد؛ دوباره اجرا کن.");updateChosen();}else receive(getIntent());
 }
 TextView text(LinearLayout root,String s,int size){TextView v=new TextView(this);v.setText(s);v.setTextSize(size);v.setTextColor(0xffe3f3e9);v.setTypeface(font);v.setPadding(0,dp(10),0,dp(10));root.addView(v);return v;}
 void button(LinearLayout root,String s,Runnable action){Button b=new Button(this);b.setText(s);b.setTextColor(-1);b.setAllCaps(false);b.setTypeface(font);GradientDrawable bg=new GradientDrawable();bg.setColor(0xff245243);bg.setCornerRadius(dp(15));b.setBackground(bg);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(52));lp.setMargins(0,dp(7),0,dp(7));root.addView(b,lp);b.setOnClickListener(v->action.run());buttons.add(b);}
 void message(String s){if(status!=null)status.setText(s);}
 void setBusy(boolean b){busy=b;for(Button x:buttons)x.setEnabled(!b);caption.setEnabled(!b);}
 void updateChosen(){chosen.setText(video==null?"هنوز ویدیویی انتخاب نشده":"ویدیو انتخاب شد؛ خروجی موردنظر را بزن.");}
 void receive(Intent i){if(!Intent.ACTION_SEND.equals(i.getAction()))return;CharSequence t=i.getCharSequenceExtra(Intent.EXTRA_TEXT);if(t!=null)caption.setText(t.subSequence(0,Math.min(t.length(),20000)));Uri u=i.getParcelableExtra(Intent.EXTRA_STREAM);if(u!=null&&"content".equals(u.getScheme())&&i.getType()!=null&&i.getType().startsWith("video/")){video=u;updateChosen();}else if(t!=null)message("متن اشتراک‌گذاری‌شده وارد شد. اگر فقط لینک است، متن کپشن را جدا وارد کن.");}
 protected void onSaveInstanceState(Bundle b){super.onSaveInstanceState(b);if(video!=null)b.putString("video",video.toString());b.putString("caption",caption.getText().toString());if(output!=null)b.putString("output",output.getName());b.putString("extension",extension);b.putString("mime",mime);b.putBoolean("busy",busy);}
 void offerSave(){if(output==null||!output.isFile()){message("هنوز خروجی آماده‌ای وجود ندارد.");return;}try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE,"kara-"+System.currentTimeMillis()+"."+extension),20);}catch(Exception e){message("انتخاب محل ذخیره انجام نشد؛ دوباره امتحان کن.");}}
 void saveCaption(){final String t=caption.getText().toString().trim();if(t.isEmpty()){message("ابتدا متن کپشن را وارد کن.");return;}setBusy(true);work.execute(()->{File f=null;try{f=File.createTempFile("kara-media-",".txt",getCacheDir());try(OutputStream o=new FileOutputStream(f)){o.write(t.getBytes("UTF-8"));}ready(f,"txt","text/plain");}catch(Exception e){if(f!=null)f.delete();failed("ذخیرهٔ کپشن انجام نشد.");}});}
 void extract(boolean audio){if(video==null){message("ابتدا ویدیو را انتخاب کن.");return;}setBusy(true);message(audio?"در حال جداکردن صدا…":"در حال ساخت ویدیوی بی‌صدا…");final Uri input=video;work.execute(()->{File f=null;try{f=File.createTempFile("kara-media-",audio?".m4a":".mp4",getCacheDir());remux(input,f,audio);ready(f,audio?"m4a":"mp4",audio?"audio/mp4":"video/mp4");}catch(Exception|OutOfMemoryError e){if(f!=null)f.delete();failed(e instanceof IOException?e.getMessage():"پردازش انجام نشد؛ فرمت، دسترسی به فایل و فضای آزاد را بررسی کن.");}});}
 void ready(File f,String ext,String type){runOnUiThread(()->{if(stopped||isDestroyed()){f.delete();return;}if(output!=null)output.delete();output=f;extension=ext;mime=type;setBusy(false);message("خروجی آماده شد؛ محل ذخیره را انتخاب کن.");offerSave();});}
 void failed(String s){runOnUiThread(()->{if(stopped||isDestroyed())return;setBusy(false);message(s==null?"پردازش انجام نشد.":s);});}
 void remux(Uri input,File f,boolean audio)throws Exception{
  MediaExtractor ex=new MediaExtractor();MediaMuxer mux=null;boolean started=false;try{ex.setDataSource(this,input,null);int track=-1;MediaFormat format=null;
   for(int j=0;j<ex.getTrackCount();j++){MediaFormat candidate=ex.getTrackFormat(j);String m=candidate.getString(MediaFormat.KEY_MIME);if(m!=null&&m.startsWith(audio?"audio/":"video/")){track=j;format=candidate;break;}}
   if(track<0)throw new IOException(audio?"این ویدیو مسیر صوتی ندارد.":"مسیر ویدیویی پیدا نشد.");String codec=format.getString(MediaFormat.KEY_MIME);
   if(audio?!"audio/mp4a-latm".equals(codec):!("video/avc".equals(codec)||"video/hevc".equals(codec)))throw new IOException("کدک این فایل پشتیبانی نمی‌شود؛ صدای AAC و ویدیوی H.264/H.265 قابل استخراج است.");
   mux=new MediaMuxer(f.getAbsolutePath(),MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
   if(!audio){MediaMetadataRetriever r=new MediaMetadataRetriever();try{r.setDataSource(this,input);String angle=r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);int deg=angle==null?0:Integer.parseInt(angle);if(deg==90||deg==180||deg==270)mux.setOrientationHint(deg);}finally{r.release();}}
   int target=mux.addTrack(format);ex.selectTrack(track);mux.start();started=true;
   int cap=16*1024*1024;if(format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)){int n=format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE);if(n>32*1024*1024)throw new IOException("فریم‌های این فایل بیش از حد بزرگ هستند.");cap=Math.max(cap,n);}
   ByteBuffer buffer=ByteBuffer.allocateDirect(cap);MediaCodec.BufferInfo info=new MediaCodec.BufferInfo();int count=0;
   while(!stopped&&!Thread.currentThread().isInterrupted()){
    buffer.clear();int size=ex.readSampleData(buffer,0);if(size<0)break;if(size>cap)throw new IOException("فریم ویدیو بیش از ظرفیت پردازش است.");int flags=ex.getSampleFlags();if((flags&MediaExtractor.SAMPLE_FLAG_ENCRYPTED)!=0)throw new IOException("فایل رمزگذاری‌شده قابل استخراج نیست.");
    info.set(0,size,ex.getSampleTime(),(flags&MediaExtractor.SAMPLE_FLAG_SYNC)!=0?MediaCodec.BUFFER_FLAG_KEY_FRAME:0);buffer.position(0);buffer.limit(size);mux.writeSampleData(target,buffer,info);count++;ex.advance();
   }
   if(stopped||Thread.currentThread().isInterrupted())throw new IOException("پردازش لغو شد.");if(count==0)throw new IOException("فایل فاقد دادهٔ قابل استخراج است.");mux.stop();started=false;
  }finally{ex.release();if(mux!=null){if(started)try{mux.stop();}catch(Exception ignored){}mux.release();}}
 }
 protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(result!=RESULT_OK||data==null||data.getData()==null){message("انتخاب یا ذخیره لغو شد.");return;}Uri u=data.getData();if(!"content".equals(u.getScheme())){message("فایل معتبر انتخاب کن.");return;}
  if(req==10){video=u;try{getContentResolver().takePersistableUriPermission(u,Intent.FLAG_GRANT_READ_URI_PERMISSION);}catch(Exception ignored){}updateChosen();message("آمادهٔ استخراج");}
  else if(req==20&&output!=null){final File source=output;setBusy(true);message("در حال ذخیره…");work.execute(()->{try(InputStream in=new FileInputStream(source);OutputStream out=getContentResolver().openOutputStream(u,"wt")){if(out==null)throw new IOException();byte[] b=new byte[32768];int n;while((n=in.read(b))!=-1){if(stopped)throw new IOException();out.write(b,0,n);}runOnUiThread(()->{if(!stopped){setBusy(false);message("فایل با موفقیت ذخیره شد.");}});}catch(Exception e){failed("ذخیره کامل نشد؛ دوباره ذخیره را بزن و فضای آزاد را بررسی کن.");}});}
 }
 public void onBackPressed(){if(busy){new AlertDialog.Builder(this).setMessage("پردازش متوقف شود؟").setPositiveButton("بله",(d,w)->finish()).setNegativeButton("ادامهٔ پردازش",null).show();}else super.onBackPressed();}
 protected void onDestroy(){stopped=true;work.shutdownNow();if(isFinishing()&&output!=null)output.delete();super.onDestroy();}
}
