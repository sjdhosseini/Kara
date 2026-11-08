package com.sjd.scan;
import android.content.*;import android.database.*;import android.net.Uri;import android.os.*;import android.provider.OpenableColumns;import java.io.*;
public class Files extends ContentProvider {
 public boolean onCreate(){return true;}
 private File file(Uri u)throws FileNotFoundException {String n=u.getLastPathSegment();if(n==null||!n.matches("camera\\.jpg|Scan-[0-9]+\\.(jpg|pdf)|receipt-[A-Za-z0-9-]+\\.pdf"))throw new FileNotFoundException();return new File(getContext().getCacheDir(),n);}
 public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException{return ParcelFileDescriptor.open(file(u),mode.contains("w")?ParcelFileDescriptor.MODE_CREATE|ParcelFileDescriptor.MODE_TRUNCATE|ParcelFileDescriptor.MODE_WRITE_ONLY:ParcelFileDescriptor.MODE_READ_ONLY);}
 public String getType(Uri u){return u.toString().endsWith("pdf")?"application/pdf":u.toString().endsWith("png")?"image/png":"image/jpeg";}
 public Cursor query(Uri u,String[] p,String s,String[] a,String o){try{File f=file(u);String[] cols=p==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:p;MatrixCursor c=new MatrixCursor(cols);Object[] vals=new Object[cols.length];for(int i=0;i<cols.length;i++)vals[i]=cols[i].equals(OpenableColumns.DISPLAY_NAME)?f.getName():cols[i].equals(OpenableColumns.SIZE)?f.length():null;c.addRow(vals);return c;}catch(Exception e){return null;}}
 public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();} public int update(Uri u,ContentValues v,String s,String[] a){return 0;}public int delete(Uri u,String s,String[] a){return 0;}
}
