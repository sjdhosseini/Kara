package com.sjd.weather;
import org.json.*;import org.xmlpull.v1.*;import java.io.*;import android.util.Xml;
final class NewsFeed {
 static String parse(String xml,String fallback)throws Exception{
  XmlPullParser p=Xml.newPullParser();p.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES,false);p.setInput(new StringReader(xml));JSONArray items=new JSONArray();JSONObject item=null;String field=null;
  for(int e=p.getEventType();e!=XmlPullParser.END_DOCUMENT;e=p.next()){
   if(e==XmlPullParser.DOCDECL)throw new IOException("DTD blocked");
   if(e==XmlPullParser.START_TAG){String tag=p.getName();if(tag.equals("item"))item=new JSONObject();else if(item!=null&&(tag.equals("description")||tag.equals("title")||tag.equals("link")||tag.equals("pubDate")||tag.equals("source")))field=tag;else field=null;}
   else if(e==XmlPullParser.TEXT&&item!=null&&field!=null)item.put(field,item.optString(field,"")+p.getText());
   else if(e==XmlPullParser.END_TAG){if(p.getName().equals("item")&&item!=null){String summary=android.text.Html.fromHtml(item.optString("description",""),android.text.Html.FROM_HTML_MODE_COMPACT).toString().replaceAll("\\s+"," ").trim();if(summary.length()>600)summary=summary.substring(0,600)+"…";item.put("summary",summary);item.remove("description");if(!item.has("source"))item.put("source",fallback);items.put(item);item=null;if(items.length()>=150)break;}field=null;}
  }return new JSONObject().put("items",items).toString();
 }
}
