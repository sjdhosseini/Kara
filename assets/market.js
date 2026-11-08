// Parse only the published quote fields. Source HTML is never inserted into the page.
function quoteNumber(text) {
  const digits=String(text).trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[,٬]/g,'').replace('٫','.');
  const value=/^\d+(\.\d+)?$/.test(digits)?Number(digits):NaN;
  if(!Number.isFinite(value)||value<=0)throw Error('invalid quote');
  return value;
}
function parseMarket(provider,code,html) {
  const capture=(pattern,scope=html)=>{const match=pattern.exec(scope);if(!match)throw Error('missing field');return match[1].trim();};
  if(provider==='alan'){
    const heading=html.indexOf('قیمت فروش',html.indexOf('آخرین بروز رسانی'));
    if(heading<0)throw Error();
    const pair=html.slice(heading,heading+10000);
    const value=capture(/<span[^>]*class="[^"]*fw-bold[^"]*fs-5[^"]*"[^>]*>\s*([^<]+)</,pair);
    return {value:quoteNumber(value)/(code==='JPY'?100:1),date:capture(/آخرین بروز رسانی\s*:\s*<span[^>]*>([^<]+)/),kind:'فروش'};
  }
  if(provider==='tg'){
    if(code!=='USD'||!html.includes('ریال'))throw Error();
    return {value:quoteNumber(capture(/data-col="info\.last_trade\.PDrCotVal"[^>]*>([^<]+)/))/10,date:capture(/زمان ثبت آخرین نرخ<\/td>\s*<td[^>]*>([^<]+)/),kind:'آخرین معامله'};
  }
  const row=capture(new RegExp('alt="'+code+'"[^>]*>[^<]*</td>([\\s\\S]*?)</tr>'));
  const values=/<\/td>\s*<td[^>]*>([\d,.]+)<\/td>/.exec(row);
  if(!values)throw Error();
  const bundle=/<sup[^>]*>(\d+)<\/sup>/.exec(row);
  return {value:quoteNumber(values[1])/(bundle?quoteNumber(bundle[1]):1),date:capture(/Archive\s+(\d{4}-\d{2}-\d{2})/),kind:'فروش آرشیو'};
}
