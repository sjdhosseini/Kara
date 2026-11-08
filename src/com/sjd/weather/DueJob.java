package com.sjd.weather;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import java.util.Iterator;

public class DueJob extends JobService {
 static void sync(Context c,String json)throws JSONException{
  JSONObject list=new JSONObject(json);
  c.getSharedPreferences("dues",0).edit().putString("list",list.toString()).apply();
  JobScheduler jobs=c.getSystemService(JobScheduler.class);
  if(list.length()==0){jobs.cancel(715);return;}
  if(jobs.getPendingJob(715)==null)jobs.schedule(new JobInfo.Builder(715,new ComponentName(c,DueJob.class)).setPersisted(true).setPeriodic(900000).build());
  notifyDue(c);
 }
 static synchronized void notifyDue(Context c){
  android.content.SharedPreferences p=c.getSharedPreferences("dues",0);
  NotificationManager nm=c.getSystemService(NotificationManager.class);
  nm.createNotificationChannel(new NotificationChannel("dues","یادآوری پرداخت و بیمه",NotificationManager.IMPORTANCE_DEFAULT));
  if(!nm.areNotificationsEnabled())return;
  try{
   JSONObject rows=new JSONObject(p.getString("list","{}"));Iterator<String> it=rows.keys();
   while(it.hasNext()){
    String id=it.next();JSONObject row=rows.getJSONObject(id);long at=row.getLong("at");
    if(at>System.currentTimeMillis()||p.getLong("sent-"+id,-1)==at)continue;
    Intent open=new Intent(c,MainActivity.class).putExtra("desk",row.optString("tab","bills")).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi=PendingIntent.getActivity(c,id.hashCode(),open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
    nm.notify(id.hashCode(),new Notification.Builder(c,"dues").setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(row.getString("title")).setContentText(row.getString("text")).setContentIntent(pi).setAutoCancel(true).build());
    p.edit().putLong("sent-"+id,at).apply();
   }
  }catch(Exception ignored){}
 }
 public boolean onStartJob(JobParameters job){notifyDue(this);return false;}
 public boolean onStopJob(JobParameters job){return false;}
}
