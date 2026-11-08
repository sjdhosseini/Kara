package com.sjd.weather;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.media.*;
import java.time.*;
import org.json.*;

public class TaskAlarm extends BroadcastReceiver {
 private static final String FIRE="com.sjd.superapp.news.TASK_ALARM";
 private static final String CHANNEL="daily_task_alarms";
 private static SharedPreferences prefs(Context c){return c.getSharedPreferences("daily_reminders",0);}
 private static JSONObject tasks(Context c)throws JSONException{return new JSONObject(prefs(c).getString("items","{}"));}
 static boolean exact(Context c){return Build.VERSION.SDK_INT<31||c.getSystemService(AlarmManager.class).canScheduleExactAlarms();}
 private static PendingIntent alarm(Context c,String id){
  Intent i=new Intent(c,TaskAlarm.class).setAction(FIRE).setData(Uri.parse("sjd://task/"+id));
  return PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
 }
 private static java.util.List<String> choices(JSONObject row){
  java.util.List<String> values=new java.util.ArrayList<>();JSONArray list=row.optJSONArray("choices");
  if(list!=null)for(int i=0;i<list.length();i++)values.add(list.optString(i));
  return values;
 }
 private static void plan(Context c,String id,JSONObject row){
  String clock=row.optString("time");if(clock.isEmpty())return;
  long at=TaskSchedule.next(clock,row.optString("mode","daily"),choices(row),row.optString("done"),prefs(c).getString("fired-"+id,""),ZonedDateTime.now());
  AlarmManager manager=c.getSystemService(AlarmManager.class);PendingIntent pi=alarm(c,id);
  prefs(c).edit().putLong("at-"+id,at).apply();
  if(at==0){manager.cancel(pi);return;}
  if(exact(c)){try{manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);return;}catch(SecurityException ignored){}}
  manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
 }
 static synchronized boolean update(Context c,String raw){
  try{
   JSONObject old=tasks(c),rows=new JSONObject(raw);
   for(java.util.Iterator<String> it=rows.keys();it.hasNext();){
    String id=it.next();JSONObject r=rows.getJSONObject(id);
    if(!id.matches("[a-zA-Z0-9-]{1,80}")||r.getString("title").trim().isEmpty())return false;
    LocalTime.parse(r.getString("time"));
    String mode=r.optString("mode","daily");
    if(!mode.matches("daily|week|dates")||(!mode.equals("daily")&&choices(r).isEmpty()))return false;
    for(String choice:choices(r)){if(mode.equals("dates"))LocalDate.parse(choice);if(mode.equals("week")&&!choice.matches("[1-7]"))return false;}
   }
   prefs(c).edit().putString("items",rows.toString()).commit();
   for(java.util.Iterator<String> it=old.keys();it.hasNext();){
    String id=it.next();if(!rows.has(id)){c.getSystemService(AlarmManager.class).cancel(alarm(c,id));prefs(c).edit().remove("at-"+id).remove("fired-"+id).apply();c.getSystemService(NotificationManager.class).cancel(id,1);}
   }
   for(java.util.Iterator<String> it=rows.keys();it.hasNext();){
    String id=it.next();JSONObject r=rows.getJSONObject(id);if(!r.toString().equals(String.valueOf(old.optJSONObject(id)))){plan(c,id,r);c.getSystemService(NotificationManager.class).cancel(id,1);}
   }
   return true;
  }catch(Exception e){return false;}
 }
 static Intent contactIntent(JSONObject action){
  if(action==null)return null;
  String number=action.optString("number"),kind=action.optString("kind");
  if(!number.matches("[+]?[0-9]{3,15}"))return null;
  if("call".equals(kind))return new Intent(Intent.ACTION_DIAL,Uri.fromParts("tel",number,null));
  if("sms".equals(kind))return new Intent(Intent.ACTION_SENDTO,Uri.fromParts("smsto",number,null)).putExtra("sms_body",action.optString("body"));
  return null;
 }
 public void onReceive(Context c,Intent i){synchronized(TaskAlarm.class){
  try{
   JSONObject rows=tasks(c);
   if(!FIRE.equals(i.getAction())){for(java.util.Iterator<String> it=rows.keys();it.hasNext();){String id=it.next();plan(c,id,rows.getJSONObject(id));}return;}
   if(i.getData()==null)return;String id=i.getData().getLastPathSegment();JSONObject r=rows.optJSONObject(id);if(r==null)return;
   long at=prefs(c).getLong("at-"+id,0);String today=LocalDate.now().toString();
   if(System.currentTimeMillis()<at)return;
   if(Instant.ofEpochMilli(at).atZone(ZoneId.systemDefault()).toLocalDate().toString().equals(today)&&!today.equals(r.optString("done"))&&!today.equals(prefs(c).getString("fired-"+id,""))){
    NotificationManager nm=c.getSystemService(NotificationManager.class);
    NotificationChannel ch=new NotificationChannel(CHANNEL,"زنگ کارهای روزانه",NotificationManager.IMPORTANCE_HIGH);
    ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());ch.enableVibration(true);nm.createNotificationChannel(ch);
    if(nm.areNotificationsEnabled()){
     Intent open=new Intent(c,MainActivity.class).putExtra("tasks",true).putExtra("taskType",r.optString("type","daily")).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
     PendingIntent tap=PendingIntent.getActivity(c,r.optString("type").equals("quick")?5702:5701,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
     JSONObject action=r.optJSONObject("action");Intent target=contactIntent(action);
     Notification.Builder notice=new Notification.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(r.getString("title")).setContentText("یادآوری کار · "+r.getString("time")).setCategory(Notification.CATEGORY_ALARM).setContentIntent(tap).setAutoCancel(true);
     if(target!=null){
      String label=action.optString("kind").equals("call")?"تماس با ":"پیامک به ";
      label+=action.optString("name");target.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      PendingIntent go=PendingIntent.getActivity(c,id.hashCode(),target,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
      notice.setContentTitle(label).setContentText(r.getString("title")+" · "+r.getString("time")).addAction(new Notification.Action.Builder(null,label,go).build());
     }
     nm.notify(id,1,notice.build());
    }
    prefs(c).edit().putString("fired-"+id,today).apply();
   }
   plan(c,id,r);
  }catch(Exception ignored){}
 }}
}
