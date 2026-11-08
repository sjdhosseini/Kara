package com.sjd.weather;
import java.time.*;
import java.util.*;

final class TaskSchedule {
 static long next(String clock,String mode,List<String> choices,String done,String fired,ZonedDateTime now){
  LocalTime time=LocalTime.parse(clock);
  LocalDate today=now.toLocalDate();
  if("dates".equals(mode)){
   long first=Long.MAX_VALUE;
   for(String choice:choices){
    LocalDate d=LocalDate.parse(choice);
    long epoch=eligible(d,time,done,fired,now);
    if(epoch>0)first=Math.min(first,epoch);
   }
   return first==Long.MAX_VALUE?0:first;
  }
  for(int i=0;i<=7;i++){
   LocalDate d=today.plusDays(i);
   if("week".equals(mode)&&!choices.contains(String.valueOf(d.getDayOfWeek().getValue())))continue;
   long epoch=eligible(d,time,done,fired,now);
   if(epoch>0)return epoch;
  }
  return 0;
 }
 private static long eligible(LocalDate d,LocalTime t,String done,String fired,ZonedDateTime now){
  if(d.toString().equals(done)||d.toString().equals(fired))return 0;
  ZonedDateTime at=d.atTime(t).atZone(now.getZone());
  return at.isAfter(now)?at.toInstant().toEpochMilli():0;
 }
}
