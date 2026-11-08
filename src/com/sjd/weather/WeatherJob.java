package com.sjd.weather;
import android.app.*;import android.app.job.*;import android.content.*;import android.os.*;import org.json.*;import java.net.*;import java.io.*;import java.util.*;
public class WeatherJob extends JobService {
 static final String CHANNEL="weather_alerts"; static final Object LOCK=new Object(); volatile boolean stopped;
 static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("weather_background",0);}
 static void schedule(Context c,boolean immediate){
  JobScheduler s=c.getSystemService(JobScheduler.class); boolean enabled=prefs(c).getBoolean("enabled",true);
  if(!enabled){s.cancel(101);s.cancel(102);return;}
  ComponentName n=new ComponentName(c,WeatherJob.class);
  if(s.getPendingJob(101)==null)s.schedule(new JobInfo.Builder(101,n).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(3600000,900000).setPersisted(true).build());
  if(immediate)s.schedule(new JobInfo.Builder(102,n).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(1000).build());
 }
 public boolean onStartJob(JobParameters p){stopped=false;new Thread(()->{boolean retry=false;synchronized(LOCK){try{runCheck();}catch(Exception e){prefs(this).edit().putString("error","دریافت ناموفق؛ اتصال اینترنت بررسی شود").apply();retry=true;}}if(!stopped)jobFinished(p,retry);},"weather-check").start();return true;}
 public boolean onStopJob(JobParameters p){stopped=true;return true;}
 String fetch(String url)throws Exception{HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();try{c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setRequestProperty("User-Agent","SJDWeather/1.3");if(c.getResponseCode()!=200)throw new IOException("HTTP");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(stopped||out.size()>8000000)throw new IOException("Stopped");out.write(b,0,n);}return out.toString("UTF-8");}}finally{c.disconnect();}}
 void runCheck()throws Exception{
  android.content.SharedPreferences p=prefs(this);String config=p.getString("config","{}");JSONObject cfg=new JSONObject(config);if(!p.getBoolean("enabled",true))return;
  JSONArray places=cfg.optJSONArray("favorites");if(places==null)places=new JSONArray();
  JSONObject current=cfg.optJSONObject("place");
  if(current!=null){
   boolean included=false;
   for(int i=0;i<places.length();i++){JSONObject point=places.getJSONObject(i);if(Math.abs(point.getDouble("lat")-current.getDouble("lat"))<0.0001&&Math.abs(point.getDouble("lon")-current.getDouble("lon"))<0.0001){included=true;break;}}
   if(!included)places.put(current);
  }
  if(places.length()>0){StringBuilder lat=new StringBuilder(),lon=new StringBuilder();for(int i=0;i<places.length();i++){JSONObject v=places.getJSONObject(i);if(i>0){lat.append(',');lon.append(',');}lat.append(v.getDouble("lat"));lon.append(v.getDouble("lon"));}
   String raw=fetch("https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&timezone=auto&timeformat=unixtime&forecast_days=2&hourly=weather_code,rain,showers,snowfall,wind_gusts_10m");
   JSONArray results=raw.trim().startsWith("[")?new JSONArray(raw):new JSONArray().put(new JSONObject(raw));if(results.length()!=places.length())throw new IOException("Missing places");
   for(int i=0;i<places.length();i++){if(stopped||!config.equals(p.getString("config",""))||!p.getBoolean("enabled",true))return;JSONObject d=results.getJSONObject(i);if(!d.has("hourly"))throw new IOException("Missing hours");notifyPlace(places.getJSONObject(i),d,cfg);}
  }
  p.edit().putLong("checked",System.currentTimeMillis()).putString("error","").apply();
  JSONObject place=cfg.optJSONObject("place");if(place!=null){String model=cfg.optString("model","best_match");String url="https://api.open-meteo.com/v1/forecast?latitude="+place.getDouble("lat")+"&longitude="+place.getDouble("lon")+"&timezone=auto&timeformat=unixtime&models="+model+"&forecast_days=10&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,weather_code,precipitation_probability,precipitation,is_day,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max";
   String data=fetch(url);new JSONObject(data).getJSONObject("current");p.edit().putString("cacheKey","forecast-v3:"+place.getString("lat")+":"+place.getString("lon")+":"+model).putString("cache",data).putLong("cacheAt",System.currentTimeMillis()).apply();}
 }
 static double value(JSONObject h,String k,int i){JSONArray a=h.optJSONArray(k);return a==null?Double.NaN:a.optDouble(i,Double.NaN);}
 static boolean[] risks(double rain,double snow,double gust,int code,double rainLimit,double windLimit){return new boolean[]{rain>=rainLimit,code==95||code==96||code==99,snow>0||(code>=71&&code<=77)||code==85||code==86,gust>=windLimit};}
 void notifyPlace(JSONObject place,JSONObject d,JSONObject cfg)throws Exception{
  NotificationManager nm=getSystemService(NotificationManager.class);nm.createNotificationChannel(new NotificationChannel(CHANNEL,"هشدار پیش‌بینی هوا",NotificationManager.IMPORTANCE_HIGH));if(!cfg.optBoolean("alerts",true)||!nm.areNotificationsEnabled()||nm.getNotificationChannel(CHANNEL).getImportance()==0)return;
  JSONObject h=d.getJSONObject("hourly");JSONArray times=h.getJSONArray("time");long now=System.currentTimeMillis()/1000;String[] names={"باران سنگین","رعدوبرق","برف","باد شدید / طوفان"};for(String old:prefs(this).getAll().keySet())if(old.startsWith("event:")&&prefs(this).getLong(old,0)<now-172800)prefs(this).edit().remove(old).apply();long horizon=3600L*Math.max(1,Math.min(24,cfg.optInt("lead",6))); boolean[] active=new boolean[4];String key=place.getString("lat")+","+place.getString("lon");
  for(int i=0;i<times.length();i++){long t=times.getLong(i);if(t>now+horizon)break;boolean[] hit=risks(value(h,"rain",i)+value(h,"showers",i),value(h,"snowfall",i),value(h,"wind_gusts_10m",i),(int)value(h,"weather_code",i),cfg.optDouble("rain",10),cfg.optDouble("wind",60));
   for(int k=0;k<4;k++){boolean beginning=hit[k]&&!active[k];active[k]=hit[k];
    if(!beginning||t<=now)continue;
    String dedup="event:"+key+":"+k+":"+t;
    if(prefs(this).getLong(dedup,0)>0)continue;
    java.text.SimpleDateFormat fmt=new java.text.SimpleDateFormat("EEE HH:mm",new Locale("fa"));fmt.setTimeZone(TimeZone.getTimeZone(d.optString("timezone","Asia/Tehran")));
    String measure=k==0?String.format(Locale.US," · %.1f mm/h",value(h,"rain",i)+value(h,"showers",i)):k==2?String.format(Locale.US," · %.1f cm",value(h,"snowfall",i)):k==3?String.format(Locale.US," · %.0f km/h",value(h,"wind_gusts_10m",i)):"";
    long minutes=(t-now+59)/60;String ahead=minutes>=60?(minutes/60)+" ساعت"+(minutes%60==0?"":" و "+(minutes%60)+" دقیقه"):minutes+" دقیقه";
    String body="تا شروع پیش‌بینی‌شده حدود "+ahead+" · "+names[k]+" · "+fmt.format(new Date(t*1000))+measure+"\nزمان محلی مقصد · پیش‌بینی Open-Meteo؛ هشدار رسمی نیست";
    Intent intent=new Intent(this,MainActivity.class).putExtra("alertPlace",place.toString()).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);int id=dedup.hashCode();PendingIntent pi=PendingIntent.getActivity(this,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    nm.notify(id,new Notification.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(place.optString("name")+" · "+names[k]).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(pi).setAutoCancel(true).build());prefs(this).edit().putLong(dedup,now).apply();
   }
  }
 }
}
