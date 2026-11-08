package com.sjd.weather;
import android.app.*;import android.os.*;import android.webkit.*;import android.Manifest;import android.content.pm.PackageManager;import android.location.*;import java.net.*;import java.io.*;import java.util.concurrent.*;import org.json.*;
public class MainActivity extends Activity {
 android.speech.tts.TextToSpeech speech; boolean speechReady=false;
 volatile int pageGeneration=0; WebView web; ExecutorService pool=Executors.newFixedThreadPool(4),newsPool=Executors.newFixedThreadPool(6),translationPool=Executors.newFixedThreadPool(2); LocationManager lm; LocationListener listener;
 public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(0xff0c4039);getWindow().setNavigationBarColor(0xff0c4039);web=new WebView(this);web.setBackgroundColor(0xff0c4039);android.widget.FrameLayout root=new android.widget.FrameLayout(this);root.setBackgroundColor(0xff0c4039);root.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));setContentView(root);getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);if(Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);root.setOnApplyWindowInsetsListener((v,insets)->{android.graphics.Insets safe=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout()|android.view.WindowInsets.Type.ime());v.setPadding(safe.left,safe.top,safe.right,safe.bottom);return android.view.WindowInsets.CONSUMED;});root.requestApplyInsets();}else{root.setFitsSystemWindows(true);}web.getSettings().setJavaScriptEnabled(true);web.getSettings().setUserAgentString(web.getSettings().getUserAgentString()+" SJDWeather/1.4 (com.sjd.weather)");web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.addJavascriptInterface(new Bridge(),"Native");web.setWebViewClient(new WebViewClient(){
 public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){pageGeneration++;}
 public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){if("app.sjd.local".equals(r.getUrl().getHost())){try{String path=r.getUrl().getPath();String mime=path.endsWith(".js")||path.endsWith(".mjs")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".wasm")?"application/wasm":path.endsWith(".ttf")?"font/ttf":path.endsWith(".jpg")?"image/jpeg":path.endsWith(".png")?"image/png":"text/html";return new WebResourceResponse(mime,"UTF-8",getAssets().open(path.equals("/")?"index.html":path.substring(1)));}catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}}return null;}
 public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){if("app.sjd.local".equals(r.getUrl().getHost()))return false;if("https".equals(r.getUrl().getScheme())){try{startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,r.getUrl()));}catch(Exception e){}}return true;}});web.loadUrl(getIntent().getBooleanExtra("tasks",false)?tasksUrl(getIntent()):getIntent().hasExtra("desk") ? deskUrl(getIntent()) : getIntent().hasExtra("alertPlace") ? "https://app.sjd.local/" : HOME);initSpeech();}
 void reply(int generation,String id,String data,String error){runOnUiThread(()->{if(generation!=pageGeneration)return;web.evaluateJavascript("window.nativeReply("+JSONObject.quote(id)+","+(data==null?"null":JSONObject.quote(data))+","+(error==null?"null":JSONObject.quote(error))+")",null);});}
 String tasksUrl(android.content.Intent i){return "https://app.sjd.local/tasks.html#"+("quick".equals(i.getStringExtra("taskType"))?"quick":"daily");}
 String deskUrl(android.content.Intent i){return "https://app.sjd.local/desk.html#"+("car".equals(i.getStringExtra("desk"))?"car":"bills");}
 protected void onResume(){super.onResume();if(web!=null)web.evaluateJavascript("window.refreshDesk&&window.refreshDesk();window.refreshTasks&&window.refreshTasks()",null);}
 protected void onNewIntent(android.content.Intent intent){super.onNewIntent(intent);setIntent(intent);web.loadUrl(intent.getBooleanExtra("tasks",false)?tasksUrl(intent):intent.hasExtra("desk")?deskUrl(intent):"https://app.sjd.local/");}
 void speechStatus(String msg){runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.speechStatus&&window.speechStatus("+JSONObject.quote(msg)+")",null);});}
 void initSpeech(){speech=new android.speech.tts.TextToSpeech(this,status->{if(status!=android.speech.tts.TextToSpeech.SUCCESS){speechStatus("موتور گفتار آماده نیست؛ تنظیمات صدا را بررسی کن.");return;}speechReady=speech.setLanguage(new java.util.Locale("fa","IR"))>=0;speech.setSpeechRate(0.93f);speech.setOnUtteranceProgressListener(new android.speech.tts.UtteranceProgressListener(){public void onStart(String id){speechStatus("در حال خواندن…");}public void onDone(String id){speechStatus("پخش پایان یافت.");}public void onError(String id){speechStatus("پخش صدا ناموفق بود؛ صدای فارسی و اتصال موتور گفتار را بررسی کن.");}});});}
 protected void onPause(){if(speech!=null)speech.stop();super.onPause();}
 private static final String HOME = "https://app.sjd.local/home.html";
 private int taskContactToken; private int taskVoiceToken; private static final int TASK_VOICE=702;
 private static final int PICK_TASK_CONTACT=701;
 protected void onActivityResult(int req,int result,android.content.Intent data){
  super.onActivityResult(req,result,data);
  if(req==TASK_VOICE){java.util.ArrayList<String> rows=data==null?null:data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);String text=result==RESULT_OK&&rows!=null&&!rows.isEmpty()?rows.get(0):null;taskVoiceReply(text,text==null?"گفتار دریافت نشد یا لغو شد؛ دوباره بگو یا متن را بنویس.":null);return;}
  if(req!=PICK_TASK_CONTACT||result!=RESULT_OK||data==null||data.getData()==null||web==null)return;
  String[] fields={android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER};
  try(android.database.Cursor c=getContentResolver().query(data.getData(),fields,null,null,null)){
   if(c==null||!c.moveToFirst())return;
   String name=c.getString(0),number=c.getString(1);
   if(number!=null)web.evaluateJavascript("window.taskContactResult&&window.taskContactResult("+taskContactToken+","+JSONObject.quote(name==null?"":name)+","+JSONObject.quote(number)+")",null);
  }catch(Exception e){android.widget.Toast.makeText(this,"شماره در دسترس نیست؛ دستی وارد کن.",0).show();}
 }
 void taskVoiceReply(String text,String error){if(web!=null)web.evaluateJavascript("window.taskVoiceResult&&window.taskVoiceResult("+taskVoiceToken+","+(text==null?"null":JSONObject.quote(text))+","+(error==null?"null":JSONObject.quote(error))+")",null);}
 public class Bridge {
 @JavascriptInterface public void startTaskVoice(int token){runOnUiThread(()->{taskVoiceToken=token;android.content.Intent i=new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM).putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE,"fa-IR").putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT,"کار و زمانش را به فارسی بگو").putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS,1);try{startActivityForResult(i,TASK_VOICE);}catch(Exception e){taskVoiceReply(null,"سرویس تشخیص گفتار روی گوشی در دسترس نیست؛ متن جمله را وارد کن.");}});}

 @JavascriptInterface public void openMediaTools(){runOnUiThread(()->startActivity(new android.content.Intent(MainActivity.this,MediaToolsActivity.class)));}

  @JavascriptInterface public void pickTaskContact(int token){runOnUiThread(()->{
   taskContactToken=token;
   try{startActivityForResult(new android.content.Intent(android.content.Intent.ACTION_PICK).setType(android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE),PICK_TASK_CONTACT);}
   catch(Exception e){android.widget.Toast.makeText(MainActivity.this,"انتخاب مخاطب در دسترس نیست؛ شماره را وارد کن.",0).show();}
  });}
  @JavascriptInterface public void launchTaskAction(String raw){runOnUiThread(()->{
   try{android.content.Intent intent=TaskAlarm.contactIntent(new JSONObject(raw));if(intent!=null)startActivity(intent);}
   catch(Exception e){android.widget.Toast.makeText(MainActivity.this,"برنامهٔ تلفن یا پیامک در دسترس نیست.",0).show();}
  });}

  @JavascriptInterface public boolean taskAlarms(String data){return TaskAlarm.update(MainActivity.this,data);}
  @JavascriptInterface public boolean exactTasks(){return TaskAlarm.exact(MainActivity.this);}
  @JavascriptInterface public boolean notificationsOn(){return getSystemService(NotificationManager.class).areNotificationsEnabled();}
  @JavascriptInterface public void exactSettings(){runOnUiThread(()->{if(Build.VERSION.SDK_INT>=31&&!TaskAlarm.exact(MainActivity.this))try{startActivity(new android.content.Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,android.net.Uri.parse("package:"+getPackageName())));}catch(Exception ignored){}});}

  @JavascriptInterface public void scan(String id){
   if(id==null||!id.matches("[a-zA-Z0-9-]{0,80}"))return;
   runOnUiThread(()->startActivity(new android.content.Intent(MainActivity.this,com.sjd.scan.MainActivity.class).putExtra("receipt",id)));
  }
  @JavascriptInterface public boolean hasReceipt(String id){return id!=null&&id.matches("[a-zA-Z0-9-]{1,80}")&&new File(getFilesDir(),"receipt-"+id+".pdf").isFile();}
  @JavascriptInterface public void viewReceipt(String id){
   if(!hasReceipt(id))return;
   runOnUiThread(()->{try{
    File from=new File(getFilesDir(),"receipt-"+id+".pdf"),to=new File(getCacheDir(),from.getName());
    java.nio.file.Files.copy(from.toPath(),to.toPath(),java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    android.net.Uri uri=android.net.Uri.parse("content://com.sjd.superapp.news.scans/"+to.getName());
    startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW).setDataAndType(uri,"application/pdf").addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION));
   }catch(Exception e){android.widget.Toast.makeText(MainActivity.this,"نمایشگر PDF در دسترس نیست",0).show();}});
  }
  @JavascriptInterface public void shareDesk(String text){if(text==null)return;runOnUiThread(()->startActivity(android.content.Intent.createChooser(new android.content.Intent(android.content.Intent.ACTION_SEND).setType("text/plain").putExtra(android.content.Intent.EXTRA_TEXT,text),"ارسال خلاصه")));}
  @JavascriptInterface public void dueList(String json){try{DueJob.sync(MainActivity.this,json);}catch(Exception ignored){}}
  @JavascriptInterface public void duePermission(){runOnUiThread(()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},19);});}

  @JavascriptInterface public void setForestTheme(String sky, boolean night) {
   if (!sky.matches("forest|sun|cloud|fog|rain|storm|snow")) return;
   getSharedPreferences("forest",0).edit().putString("sky",sky).putBoolean("night",night).apply();
  }
  @JavascriptInterface public void convertFile(String type) {
   if (!FileConvertActivity.supports(type)) return;
   runOnUiThread(() -> startActivity(new android.content.Intent(MainActivity.this, FileConvertActivity.class).putExtra("type",type)));
  }
  @JavascriptInterface public void openGames(String game) {
   if (game == null || !game.matches("all|pant|music|mafia|spy|lip|names")) return;
   runOnUiThread(() -> startActivity(new android.content.Intent(MainActivity.this, com.sjd.pantomime.MainActivity.class).putExtra("game", game)));
  }
 @JavascriptInterface public void speak(String text){runOnUiThread(()->{if(!speechReady){speechStatus("صدای فارسی روی گوشی آماده نیست. از تنظیمات گفتار، زبان فارسی را نصب یا موتور سازگار انتخاب کن.");return;}if(text.length()>3500)textLimit(text);else if(speech.speak(text,android.speech.tts.TextToSpeech.QUEUE_FLUSH,null,"weather")==android.speech.tts.TextToSpeech.ERROR)speechStatus("امکان پخش صدا وجود ندارد.");});}
 private void textLimit(String text){speech.speak(text.substring(0,3500),android.speech.tts.TextToSpeech.QUEUE_FLUSH,null,"weather");}
 @JavascriptInterface public void stopSpeech(){runOnUiThread(()->{if(speech!=null)speech.stop();speechStatus("پخش متوقف شد.");});}
 @JavascriptInterface public void speechSettings(){runOnUiThread(()->{try{startActivity(new android.content.Intent("com.android.settings.TTS_SETTINGS"));}catch(Exception e){speechStatus("تنظیمات گوشی ← تبدیل نوشتار به گفتار را باز کن.");}});}

 @JavascriptInterface public String takeAlertPlace(){String p=getIntent().getStringExtra("alertPlace");getIntent().removeExtra("alertPlace");return p==null?"null":p;}
 @JavascriptInterface public void configure(String raw){try{JSONObject cfg=new JSONObject(raw);JSONArray a=cfg.getJSONArray("favorites");if(a.length()>50)return;for(int i=0;i<a.length();i++){JSONObject p=a.getJSONObject(i);double lat=p.getDouble("lat"),lon=p.getDouble("lon");if(!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;}
 boolean changed=!raw.equals(WeatherJob.prefs(MainActivity.this).getString("config",""));WeatherJob.prefs(MainActivity.this).edit().putString("config",raw).putBoolean("enabled",cfg.optBoolean("auto",true)).apply();WeatherJob.schedule(MainActivity.this,changed);
 }catch(Exception e){}}
 @JavascriptInterface public String backgroundStatus(){try{android.content.SharedPreferences p=WeatherJob.prefs(MainActivity.this);return new JSONObject().put("checked",p.getLong("checked",0)).put("error",p.getString("error","")).put("permission",getSystemService(NotificationManager.class).areNotificationsEnabled()).put("cacheKey",p.getString("cacheKey","")).put("cacheAt",p.getLong("cacheAt",0)).put("cache",p.getString("cache","")).toString();}catch(Exception e){return "{}";}}
 @JavascriptInterface public void enableNotifications(){runOnUiThread(()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},8);else{android.content.Intent i=new android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName());startActivity(i);}});}
 @JavascriptInterface public void checkWeather(){WeatherJob.schedule(MainActivity.this,true);}

 @JavascriptInterface public void request(String id,String address){final int generation=pageGeneration;(address.startsWith("https://translate.googleapis.com/")?translationPool:id.startsWith("news:")?newsPool:pool).execute(()->{HttpURLConnection c=null;try{URL u=new URL(address);String h=u.getHost();if(!u.getProtocol().equals("https")||!(h.equals("translate.googleapis.com")||h.equals("api.gold-api.com")||h.equals("api.frankfurter.dev")||h.equals("alanchand.com")||h.equals("www.tgju.org")||h.equals("www.bonbast.com")||h.equals("archive-api.open-meteo.com")||h.equals("moxie.foxnews.com")||h.equals("feeds.bbci.co.uk")||h.equals("news.google.com")||h.equals("www.irna.ir")||h.equals("www.mehrnews.com")||h.equals("www.isna.ir")||h.equals("www.varzesh3.com")||h.equals("football360.ir")||h.equals("www.theguardian.com")||h.equals("api.open-meteo.com")||h.equals("geocoding-api.open-meteo.com")||h.equals("api.met.no")||h.equals("api.rainviewer.com")||h.equals("openmeteo.s3.amazonaws.com")))throw new IOException("Host blocked");c=(HttpURLConnection)u.openConnection();c.setConnectTimeout(16000);c.setReadTimeout(h.equals("archive-api.open-meteo.com")?65000:20000);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","SJDWeather/1.4 (personal Android weather application; com.sjd.weather)");if(c.getResponseCode()!=200)throw new IOException("HTTP "+c.getResponseCode());ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){out.write(buf,0,n);if(out.size()>4000000)throw new IOException("Response too large");}}String body=out.toString("UTF-8");if(h.equals("www.tgju.org")){
 int price=body.indexOf("نرخ فعلی::"), unit=body.indexOf("واحد پولی :"), date=body.indexOf("زمان ثبت آخرین نرخ");
 if(price<0||unit<0||date<0)throw new IOException("Missing fields");
 body=body.substring(price,Math.min(body.length(),price+1100))+body.substring(unit,Math.min(body.length(),unit+190))+body.substring(date,Math.min(body.length(),date+240));}
 boolean feed=h.equals("moxie.foxnews.com")||h.equals("feeds.bbci.co.uk")||h.equals("news.google.com")||h.equals("www.irna.ir")||h.equals("www.mehrnews.com")||h.equals("www.isna.ir")||h.equals("www.varzesh3.com")||h.equals("www.theguardian.com");reply(generation,id,feed?NewsFeed.parse(body,h.equals("moxie.foxnews.com")?"Fox News":h.equals("feeds.bbci.co.uk")?"BBC":h.equals("www.irna.ir")?"ایرنا":h.equals("www.mehrnews.com")?"مهر":"Google News"):body,null);}catch(Exception e){reply(generation,id,null,e.getMessage());}finally{if(c!=null)c.disconnect();}});}
 @JavascriptInterface public void locate(){runOnUiThread(()->{if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},7);}else locateNow();});}
 }
 void locationError(){web.evaluateJavascript("window.locationFailed()",null);}
 void locateNow(){try{lm=(LocationManager)getSystemService(LOCATION_SERVICE);String p=lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)?LocationManager.NETWORK_PROVIDER:LocationManager.GPS_PROVIDER;if(listener!=null)lm.removeUpdates(listener);listener=new LocationListener(){public void onLocationChanged(Location l){if(listener!=this)return;lm.removeUpdates(this);listener=null;web.evaluateJavascript("window.locationReady("+l.getLatitude()+","+l.getLongitude()+")",null);}public void onStatusChanged(String p,int s,Bundle b){}public void onProviderEnabled(String p){}public void onProviderDisabled(String p){locationError();}};final LocationListener active=listener;lm.requestLocationUpdates(p,0,0,active);new Handler().postDelayed(()->{if(listener!=active||isDestroyed())return;lm.removeUpdates(active);listener=null;web.evaluateJavascript("window.locationTimedOut()",null);},20000);}catch(Exception e){locationError();}}
 public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==19){DueJob.notifyDue(this);web.evaluateJavascript("window.refreshTasks&&window.refreshTasks()",null);return;}if(r==8){WeatherJob.schedule(this,true);return;}if(r==7&&checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED)locateNow();else locationError();}
 public void onBackPressed(){web.evaluateJavascript("(()=>{let d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()",result->{if("true".equals(result))return;if(web.getUrl()!=null&&(web.getUrl().contains("map.html")||web.getUrl().contains("report.html"))){web.loadUrl("https://app.sjd.local/");}else if(web.getUrl()!=null&&web.getUrl().startsWith(HOME+"#")) web.loadUrl(HOME);else if(HOME.equals(web.getUrl())) finish(); else web.loadUrl(HOME);});}
 protected void onDestroy(){if(speech!=null){speech.stop();speech.shutdown();}if(lm!=null&&listener!=null)lm.removeUpdates(listener);pool.shutdownNow();newsPool.shutdownNow();translationPool.shutdownNow();web.destroy();super.onDestroy();}
}
